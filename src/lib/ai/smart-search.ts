import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type SmartSearchResult = {
  label: string
  description: string
  href: string
  type: 'creator' | 'deal' | 'campaign' | 'insight'
  count?: number
}

type ParsedQuery = {
  kind: 'affiliates' | 'deals' | 'campaigns'
  affiliateWhere?: Prisma.AffiliateWhereInput
  dealWhere?: Prisma.DealWhereInput
  orderBy?: Record<string, 'asc' | 'desc'>
  description: string
}

function parseGmvThreshold(text: string): number | null {
  const patterns = [
    /gmv\s*(?:di\s*atas|above|>|lebih\s*dari)\s*(?:rp\s*)?([\d.,]+)\s*(jt|juta|m|miliar|rb|ribu|k)?/i,
    /([\d.,]+)\s*(jt|juta|m|miliar)\s*gmv/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      let num = parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
      const unit = (m[2] || '').toLowerCase()
      if (unit.startsWith('jt') || unit.startsWith('juta')) num *= 1_000_000
      else if (unit.startsWith('m') || unit.startsWith('miliar')) num *= 1_000_000_000
      else if (unit.startsWith('rb') || unit.startsWith('ribu') || unit === 'k') num *= 1_000
      return num
    }
  }
  return null
}

function parseDays(text: string): number | null {
  const m = text.match(/(\d+)\s*(?:hari|days?)/i)
  return m ? parseInt(m[1], 10) : null
}

export function parseNaturalLanguageQuery(query: string): ParsedQuery | null {
  const q = query.trim().toLowerCase()
  if (q.length < 8) return null

  const isNl =
    /show|find|tampilkan|cari|creator|affiliate|gmv|blacklist|overdue|sow|contact|hubungi|video|conversion|belum|without|tanpa/i.test(q)
  if (!isNl) return null

  const days = parseDays(q)
  const gmvMin = parseGmvThreshold(q)
  const cutoff = days ? new Date(Date.now() - days * 86400000) : null

  if (/blacklist/i.test(q)) {
    return {
      kind: 'affiliates',
      affiliateWhere: { deletedAt: null, status: 'Blacklist' },
      description: 'Creator dengan status blacklist',
    }
  }

  if (/overdue\s*sow|sow\s*overdue|sow\s*terlambat/i.test(q)) {
    return {
      kind: 'deals',
      dealWhere: { deletedAt: null, sowStatus: 'Overdue' },
      description: 'Deal dengan SOW overdue',
    }
  }

  if (/tanpa\s*video|without\s*video|belum\s*upload|no\s*video/i.test(q)) {
    return {
      kind: 'deals',
      dealWhere: { deletedAt: null, uploadedVideoCount: 0, sowStatus: { not: 'Completed' } },
      description: 'Deal aktif tanpa video upload',
    }
  }

  if (/belum\s*(?:di)?hubungi|never\s*contact|not\s*contact/i.test(q)) {
    return {
      kind: 'affiliates',
      affiliateWhere: { deletedAt: null, status: 'Belum Dihubungi' },
      orderBy: { gmvCount: 'desc' },
      description: 'Creator yang belum pernah dihubungi',
    }
  }

  if (cutoff && /tidak\s*(?:di)?hubungi|not\s*contact|no\s*contact|inactive|tidak\s*aktif/i.test(q)) {
    return {
      kind: 'affiliates',
      affiliateWhere: {
        deletedAt: null,
        status: { notIn: ['Blacklist', 'Tidak Relevan'] },
        OR: [
          { lastContactDate: { lt: cutoff } },
          { lastContactDate: null, createdAt: { lt: cutoff } },
        ],
      },
      orderBy: { gmvCount: 'desc' },
      description: `Creator tidak dihubungi ${days} hari terakhir`,
    }
  }

  if (gmvMin) {
    return {
      kind: 'affiliates',
      affiliateWhere: { deletedAt: null, gmvCount: { gte: gmvMin } },
      orderBy: { gmvCount: 'desc' },
      description: `Creator dengan GMV di atas Rp ${gmvMin.toLocaleString('id-ID')}`,
    }
  }

  if (/top|tertinggi|highest|perform|conversion/i.test(q) && /gmv|creator|affiliate/i.test(q)) {
    return {
      kind: 'affiliates',
      affiliateWhere: { deletedAt: null },
      orderBy: { gmvCount: 'desc' },
      description: 'Creator dengan performa GMV tertinggi',
    }
  }

  if (/follow.?up|tindak\s*lanjut/i.test(q)) {
    return {
      kind: 'affiliates',
      affiliateWhere: { deletedAt: null, status: { in: ['Follow Up 1', 'Follow Up 2'] } },
      orderBy: { lastFollowUpDate: 'asc' },
      description: 'Creator dalam status follow up',
    }
  }

  if (/negotiation|negosiasi/i.test(q)) {
    return {
      kind: 'affiliates',
      affiliateWhere: { deletedAt: null, status: 'Negotiation' },
      orderBy: { gmvCount: 'desc' },
      description: 'Creator dalam tahap negosiasi',
    }
  }

  if (/campaign\s*aktif|active\s*campaign/i.test(q)) {
    return {
      kind: 'campaigns',
      description: 'Campaign yang sedang aktif',
    }
  }

  return null
}

export async function executeSmartSearch(query: string): Promise<SmartSearchResult[]> {
  const parsed = parseNaturalLanguageQuery(query)
  if (!parsed) return []

  const results: SmartSearchResult[] = []

  if (parsed.kind === 'affiliates') {
    const affiliates = await prisma.affiliate.findMany({
      where: parsed.affiliateWhere,
      orderBy: parsed.orderBy || { username: 'asc' },
      take: 8,
      select: { id: true, username: true, name: true, status: true, gmv: true, gmvCount: true },
    })

    if (affiliates.length === 0) {
      results.push({
        label: parsed.description,
        description: 'Tidak ada hasil ditemukan',
        href: '/affiliates',
        type: 'insight',
        count: 0,
      })
      return results
    }

    for (const a of affiliates) {
      results.push({
        label: `@${a.username}${a.name ? ` (${a.name})` : ''}`,
        description: `${a.status} · GMV ${a.gmv || 'N/A'}`,
        href: `/affiliates/${a.id}`,
        type: 'creator',
      })
    }

    const total = await prisma.affiliate.count({ where: parsed.affiliateWhere })
    if (total > affiliates.length) {
      results.push({
        label: `+${total - affiliates.length} creator lainnya`,
        description: parsed.description,
        href: '/affiliates',
        type: 'insight',
        count: total,
      })
    }
  }

  if (parsed.kind === 'deals') {
    const deals = await prisma.deal.findMany({
      where: parsed.dealWhere,
      take: 8,
      include: { affiliate: { select: { id: true, username: true } } },
    })

    for (const d of deals) {
      results.push({
        label: `@${d.affiliate.username} — ${d.product}`,
        description: `SOW: ${d.sowStatus} · Video: ${d.uploadedVideoCount}`,
        href: `/affiliates/${d.affiliate.id}`,
        type: 'deal',
      })
    }
  }

  if (parsed.kind === 'campaigns') {
    const campaigns = await prisma.campaign.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      take: 8,
      select: { id: true, name: true, status: true, _count: { select: { deals: true } } },
    })

    for (const c of campaigns) {
      results.push({
        label: c.name,
        description: `${c.status} · ${c._count.deals} deals`,
        href: '/campaigns',
        type: 'campaign',
      })
    }
  }

  return results
}
