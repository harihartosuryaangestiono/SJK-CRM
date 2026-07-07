import prisma from '@/lib/prisma'
import type { HealthCategory, HealthScoreResult } from './types'

export type { HealthCategory, HealthScoreResult } from './types'

function getCategory(score: number): HealthCategory {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Needs Attention'
  return 'Critical'
}

function clamp(n: number, max: number) {
  return Math.min(max, Math.max(0, n))
}

export async function calculateHealthScore(affiliateId: string): Promise<HealthScoreResult | null> {
  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId, deletedAt: null },
    include: {
      deals: { where: { deletedAt: null } },
      contactHistory: true,
      statusHistory: true,
    },
  })

  if (!affiliate) return null

  const now = Date.now()
  const daysSinceContact = affiliate.lastContactDate
    ? (now - new Date(affiliate.lastContactDate).getTime()) / 86400000
    : 999

  // Activity (0-15): recent contact + active status
  let activity = 0
  if (daysSinceContact <= 7) activity += 10
  else if (daysSinceContact <= 14) activity += 7
  else if (daysSinceContact <= 30) activity += 4
  if (['Deal', 'Campaign Berjalan', 'Negotiation', 'Follow Up 1', 'Follow Up 2'].includes(affiliate.status)) {
    activity += 5
  }
  activity = clamp(activity, 15)

  // Response speed (0-10): hours from listing to first contact
  let responseSpeed = 5
  if (affiliate.lastContactDate && affiliate.listingDate) {
    const hours = (new Date(affiliate.lastContactDate).getTime() - new Date(affiliate.listingDate).getTime()) / 3600000
    if (hours <= 24) responseSpeed = 10
    else if (hours <= 72) responseSpeed = 8
    else if (hours <= 168) responseSpeed = 6
    else responseSpeed = 3
  } else if (affiliate.status === 'Belum Dihubungi') {
    responseSpeed = 0
  }

  // Deal history (0-15)
  const dealCount = affiliate.deals.length
  let dealHistory = 0
  if (dealCount >= 3) dealHistory = 15
  else if (dealCount === 2) dealHistory = 12
  else if (dealCount === 1) dealHistory = 8
  if (affiliate.status === 'Deal' || affiliate.status === 'Repeat Affiliate') dealHistory = Math.max(dealHistory, 10)

  // Revenue / GMV (0-15)
  let revenue = 0
  if (affiliate.gmvCount >= 150_000_000) revenue = 15
  else if (affiliate.gmvCount >= 50_000_000) revenue = 12
  else if (affiliate.gmvCount >= 15_000_000) revenue = 9
  else if (affiliate.gmvCount >= 5_000_000) revenue = 6
  else if (affiliate.gmvCount > 0) revenue = 3

  // Video completion (0-15)
  let videoCompletion = 0
  const activeDeals = affiliate.deals.filter(d => d.sowStatus !== 'Completed')
  if (activeDeals.length === 0 && dealCount > 0) {
    videoCompletion = 15
  } else if (activeDeals.length > 0) {
    const rates = activeDeals.map(d => {
      const target = Math.max(d.targetVideo, 1)
      return d.uploadedVideoCount / target
    })
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
    videoCompletion = clamp(Math.round(avgRate * 15), 15)
  }

  // SOW completion (0-15)
  let sowCompletion = 0
  if (dealCount > 0) {
    const completed = affiliate.deals.filter(d => d.sowStatus === 'Completed').length
    const overdue = affiliate.deals.filter(d => d.sowStatus === 'Overdue').length
    sowCompletion = clamp(Math.round((completed / dealCount) * 15) - overdue * 3, 15)
  }

  // Communication (0-10)
  const contactCount = affiliate.contactHistory.length
  const responded = affiliate.contactHistory.filter(c => c.status === 'Responded').length
  let communication = clamp(Math.min(contactCount * 2, 6) + (responded > 0 ? 4 : 0), 10)

  // Growth potential (0-5)
  let growth = 0
  if (affiliate.followersCount >= 100_000) growth += 3
  else if (affiliate.followersCount >= 50_000) growth += 2
  else if (affiliate.followersCount >= 10_000) growth += 1
  if (affiliate.curated) growth += 2
  growth = clamp(growth, 5)

  // Penalties
  let penalty = 0
  if (affiliate.status === 'Blacklist') penalty += 40
  if (affiliate.status === 'Reject' || affiliate.status === 'Tidak Relevan') penalty += 20
  if (affiliate.status === 'No Response') penalty += 10

  const rawScore = activity + responseSpeed + dealHistory + revenue + videoCompletion + sowCompletion + communication + growth
  const score = clamp(Math.round(rawScore - penalty), 100)
  const category = getCategory(score)

  const narrative = buildNarrative(category, score, {
    daysSinceContact,
    dealCount,
    affiliate,
    overdue: affiliate.deals.filter(d => d.sowStatus === 'Overdue').length,
  })

  return {
    score,
    category,
    factors: {
      activity,
      responseSpeed,
      dealHistory,
      revenue,
      videoCompletion,
      sowCompletion,
      communication,
      growth,
    },
    narrative,
  }
}

function buildNarrative(
  category: HealthCategory,
  score: number,
  ctx: { daysSinceContact: number; dealCount: number; affiliate: { username: string; status: string; gmv: string | null }; overdue: number }
): string {
  const parts: string[] = []
  parts.push(`Health Score @${ctx.affiliate.username}: ${score}/100 (${category}).`)

  if (ctx.daysSinceContact <= 7) parts.push('Aktivitas komunikasi recent.')
  else if (ctx.daysSinceContact > 30) parts.push(`Tidak dihubungi ${Math.round(ctx.daysSinceContact)} hari — risiko churn.`)

  if (ctx.dealCount > 0) parts.push(`${ctx.dealCount} deal tercatat.`)
  if (ctx.overdue > 0) parts.push(`${ctx.overdue} SOW overdue perlu tindakan.`)

  if (category === 'Excellent' || category === 'Good') {
    parts.push('Creator potensial untuk repeat deal atau premium campaign.')
  } else if (category === 'Critical' || category === 'Needs Attention') {
    parts.push('Perlu intervensi PIC segera.')
  }

  return parts.join(' ')
}

export async function getTopHealthScores(limit = 5) {
  const affiliates = await prisma.affiliate.findMany({
    where: { deletedAt: null, status: { notIn: ['Blacklist', 'Tidak Relevan'] } },
    orderBy: { gmvCount: 'desc' },
    take: 20,
    select: { id: true, username: true },
  })

  const scored = await Promise.all(
    affiliates.map(async a => {
      const health = await calculateHealthScore(a.id)
      return health ? { affiliateId: a.id, username: a.username, ...health } : null
    })
  )

  return scored
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
