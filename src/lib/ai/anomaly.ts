import prisma from '@/lib/prisma'

export type AnomalyType =
  | 'duplicate_wa'
  | 'duplicate_profile'
  | 'missing_data'
  | 'inactive_creator'
  | 'missing_video'
  | 'overdue_sow'
  | 'low_response'
  | 'incomplete_campaign'

export type Anomaly = {
  id: string
  type: AnomalyType
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  count: number
  entities?: { id: string; label: string; href: string }[]
  href?: string
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const anomalies: Anomaly[] = []

  // Duplicate WhatsApp numbers
  const affiliatesWithWa = await prisma.affiliate.findMany({
    where: { deletedAt: null, waContact: { not: null } },
    select: { id: true, username: true, waContact: true },
  })

  const waMap = new Map<string, typeof affiliatesWithWa>()
  for (const a of affiliatesWithWa) {
    if (!a.waContact) continue
    const key = a.waContact.trim()
    if (!waMap.has(key)) waMap.set(key, [])
    waMap.get(key)!.push(a)
  }

  for (const [wa, dupes] of waMap.entries()) {
    if (dupes.length <= 1) continue
    anomalies.push({
      id: `dup-wa-${wa}`,
      type: 'duplicate_wa',
      severity: 'high',
      title: 'Duplikat WhatsApp',
      description: `Nomor ${wa} digunakan ${dupes.length} creator.`,
      count: dupes.length,
      entities: dupes.slice(0, 5).map(d => ({ id: d.id, label: `@${d.username}`, href: `/affiliates/${d.id}` })),
    })
    if (anomalies.filter(a => a.type === 'duplicate_wa').length >= 5) break
  }

  // Duplicate profile links
  const affiliatesWithLink = await prisma.affiliate.findMany({
    where: { deletedAt: null, profileLink: { not: null } },
    select: { id: true, username: true, profileLink: true },
  })

  const linkMap = new Map<string, typeof affiliatesWithLink>()
  for (const a of affiliatesWithLink) {
    if (!a.profileLink) continue
    const key = a.profileLink.trim().toLowerCase()
    if (!linkMap.has(key)) linkMap.set(key, [])
    linkMap.get(key)!.push(a)
  }

  for (const [, dupes] of linkMap.entries()) {
    if (dupes.length <= 1) continue
    anomalies.push({
      id: `dup-link-${dupes[0].id}`,
      type: 'duplicate_profile',
      severity: 'high',
      title: 'Duplikat TikTok Profile',
      description: `Profile link sama pada ${dupes.length} creator.`,
      count: dupes.length,
      entities: dupes.slice(0, 5).map(d => ({ id: d.id, label: `@${d.username}`, href: `/affiliates/${d.id}` })),
    })
    if (anomalies.filter(a => a.type === 'duplicate_profile').length >= 3) break
  }

  // Missing critical data
  const [missingWa, missingNiche] = await Promise.all([
    prisma.affiliate.count({ where: { deletedAt: null, OR: [{ waContact: null }, { waContact: '' }] } }),
    prisma.affiliate.count({ where: { deletedAt: null, OR: [{ niche: null }, { niche: '' }] } }),
  ])

  if (missingWa > 0) {
    anomalies.push({
      id: 'missing-wa',
      type: 'missing_data',
      severity: missingWa > 20 ? 'medium' : 'low',
      title: 'Data WA Kosong',
      description: `${missingWa} creator tanpa nomor WhatsApp.`,
      count: missingWa,
      href: '/affiliates',
    })
  }

  if (missingNiche > 0) {
    anomalies.push({
      id: 'missing-niche',
      type: 'missing_data',
      severity: 'low',
      title: 'Niche Belum Diisi',
      description: `${missingNiche} creator tanpa kategori niche.`,
      count: missingNiche,
      href: '/affiliates',
    })
  }

  // Inactive creators (30+ days no contact, not terminal status)
  const inactiveCount = await prisma.affiliate.count({
    where: {
      deletedAt: null,
      status: { notIn: ['Blacklist', 'Tidak Relevan', 'Reject'] },
      OR: [
        { lastContactDate: { lt: thirtyDaysAgo } },
        { lastContactDate: null, createdAt: { lt: thirtyDaysAgo } },
      ],
    },
  })

  if (inactiveCount > 0) {
    const samples = await prisma.affiliate.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['Blacklist', 'Tidak Relevan', 'Reject'] },
        OR: [
          { lastContactDate: { lt: thirtyDaysAgo } },
          { lastContactDate: null, createdAt: { lt: thirtyDaysAgo } },
        ],
      },
      take: 5,
      orderBy: { gmvCount: 'desc' },
      select: { id: true, username: true },
    })

    anomalies.push({
      id: 'inactive-creators',
      type: 'inactive_creator',
      severity: inactiveCount > 10 ? 'high' : 'medium',
      title: 'Creator Tidak Aktif',
      description: `${inactiveCount} creator tidak dihubungi >30 hari.`,
      count: inactiveCount,
      entities: samples.map(s => ({ id: s.id, label: `@${s.username}`, href: `/affiliates/${s.id}` })),
      href: '/contact',
    })
  }

  // Deals without video upload
  const noVideoDeals = await prisma.deal.findMany({
    where: { deletedAt: null, uploadedVideoCount: 0, sowStatus: { not: 'Completed' } },
    take: 5,
    include: { affiliate: { select: { id: true, username: true } } },
  })
  const noVideoCount = await prisma.deal.count({
    where: { deletedAt: null, uploadedVideoCount: 0, sowStatus: { not: 'Completed' } },
  })

  if (noVideoCount > 0) {
    anomalies.push({
      id: 'missing-video',
      type: 'missing_video',
      severity: noVideoCount > 5 ? 'high' : 'medium',
      title: 'Deal Tanpa Video',
      description: `${noVideoCount} deal aktif belum upload video.`,
      count: noVideoCount,
      entities: noVideoDeals.map(d => ({
        id: d.id,
        label: `@${d.affiliate.username}`,
        href: `/affiliates/${d.affiliate.id}`,
      })),
      href: '/progress',
    })
  }

  // Overdue SOW
  const overdueCount = await prisma.deal.count({ where: { deletedAt: null, sowStatus: 'Overdue' } })
  if (overdueCount > 0) {
    const samples = await prisma.deal.findMany({
      where: { deletedAt: null, sowStatus: 'Overdue' },
      take: 5,
      include: { affiliate: { select: { id: true, username: true } } },
    })
    anomalies.push({
      id: 'sow-overdue',
      type: 'overdue_sow',
      severity: 'high',
      title: 'SOW Overdue',
      description: `${overdueCount} SOW melewati deadline.`,
      count: overdueCount,
      entities: samples.map(d => ({
        id: d.id,
        label: `@${d.affiliate.username}`,
        href: `/affiliates/${d.affiliate.id}`,
      })),
      href: '/sow',
    })
  }

  // Low response rate creators in follow-up limbo
  const noResponseCount = await prisma.affiliate.count({
    where: { deletedAt: null, status: 'No Response' },
  })
  if (noResponseCount > 0) {
    anomalies.push({
      id: 'low-response',
      type: 'low_response',
      severity: noResponseCount > 15 ? 'medium' : 'low',
      title: 'No Response',
      description: `${noResponseCount} creator dalam status No Response.`,
      count: noResponseCount,
      href: '/contact',
    })
  }

  // Incomplete campaigns (active but below target)
  const activeCampaigns = await prisma.campaign.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    include: { _count: { select: { deals: true } } },
  })

  for (const c of activeCampaigns) {
    if (c.targetCreator > 0 && c._count.deals < c.targetCreator * 0.5) {
      anomalies.push({
        id: `campaign-incomplete-${c.id}`,
        type: 'incomplete_campaign',
        severity: 'medium',
        title: `Campaign Under Target: ${c.name}`,
        description: `Hanya ${c._count.deals}/${c.targetCreator} creator deal.`,
        count: c.targetCreator - c._count.deals,
        href: '/campaigns',
      })
    }
  }

  anomalies.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 }
    return sev[a.severity] - sev[b.severity]
  })

  return anomalies.slice(0, 12)
}
