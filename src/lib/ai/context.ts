import prisma from '@/lib/prisma'
import { CampaignStatus } from '@prisma/client'
import type { CopilotPageContext, CRMContextSnapshot } from './types'

function detectIntents(message: string): string[] {
  const lower = message.toLowerCase()
  const intents: string[] = []
  if (/follow.?up|tindak lanjut|hubungi/i.test(lower)) intents.push('followups')
  if (/sow|deadline|overdue|terlambat/i.test(lower)) intents.push('sow')
  if (/blacklist|blokir/i.test(lower)) intents.push('blacklist')
  if (/campaign|kampanye/i.test(lower)) intents.push('campaigns')
  if (/top|tertinggi|gmv|perform|creator/i.test(lower)) intents.push('topCreators')
  if (/reminder|pengingat|hari ini|today|priorit/i.test(lower)) intents.push('workflow')
  if (/deal|konversi|conversion|revenue/i.test(lower)) intents.push('deals')
  if (/affiliate|creator|@|username/i.test(lower)) intents.push('affiliates')
  return intents
}

async function getDashboardMetrics() {
  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    totalAffiliates,
    contacted,
    deals,
    pending,
    followUp,
    negotiation,
    reject,
    newThisMonth,
    newLastMonth,
    todayContacts,
    todayDeals,
    activeCampaigns,
    blacklisted,
    sowOverdue,
    needFollowUpToday,
    needReapproachToday,
    sowDueToday,
  ] = await Promise.all([
    prisma.affiliate.count({ where: { deletedAt: null } }),
    prisma.affiliate.count({ where: { status: { not: 'Belum Dihubungi' }, deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Deal', deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Belum Dihubungi', deletedAt: null } }),
    prisma.affiliate.count({ where: { status: { in: ['Follow Up 1', 'Follow Up 2'] }, deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Negotiation', deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Reject', deletedAt: null } }),
    prisma.affiliate.count({ where: { createdAt: { gte: thisMonthStart }, deletedAt: null } }),
    prisma.affiliate.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart }, deletedAt: null } }),
    prisma.contactHistory.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.deal.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
    prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE, deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Blacklist', deletedAt: null } }),
    prisma.deal.count({ where: { deletedAt: null, sowStatus: 'Overdue' } }),
    prisma.reminder.count({ where: { type: { in: ['FOLLOW_UP', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] }, completed: false, dueDate: { lte: now } } }),
    prisma.reminder.count({ where: { type: 'RE_APPROACH', completed: false, dueDate: { lte: now } } }),
    prisma.deal.count({
      where: {
        deletedAt: null,
        sowStatus: { not: 'Completed' },
        deadline: { gte: todayStart, lte: new Date(todayStart.getTime() + 86400000 - 1) },
      },
    }),
  ])

  const topCreators = await prisma.affiliate.findMany({
    where: { deletedAt: null },
    take: 5,
    orderBy: { gmvCount: 'desc' },
    select: { username: true, gmv: true, gmvCount: true, status: true, followers: true },
  })

  const conversionRate = contacted > 0 ? parseFloat(((deals / contacted) * 100).toFixed(1)) : 0
  const monthlyGrowth = newLastMonth > 0 ? parseFloat((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)) : 0

  return {
    totalAffiliates,
    contacted,
    deals,
    pending,
    followUp,
    negotiation,
    reject,
    newThisMonth,
    newLastMonth,
    monthlyGrowthPct: monthlyGrowth,
    conversionRatePct: conversionRate,
    todayContacts,
    todayDeals,
    activeCampaigns,
    blacklisted,
    sowOverdue,
    needFollowUpToday,
    needReapproachToday,
    sowDueToday,
    topCreators: topCreators.map(c => ({
      username: c.username,
      gmv: c.gmv,
      gmvCount: c.gmvCount,
      status: c.status,
      followers: c.followers,
    })),
  }
}

async function getFollowUpQueue() {
  const now = new Date()
  return prisma.reminder.findMany({
    where: { completed: false, dueDate: { lte: now } },
    take: 15,
    orderBy: { dueDate: 'asc' },
    include: {
      affiliate: { select: { username: true, status: true, waContact: true } },
      deal: { select: { product: true, sowStatus: true, deadline: true } },
    },
  })
}

async function getOverdueSow() {
  return prisma.deal.findMany({
    where: { deletedAt: null, sowStatus: 'Overdue' },
    take: 10,
    include: {
      affiliate: { select: { username: true, status: true } },
      campaign: { select: { name: true } },
    },
  })
}

async function getCampaignSummary() {
  return prisma.campaign.findMany({
    where: { deletedAt: null },
    take: 10,
    orderBy: { updatedAt: 'desc' },
    select: {
      name: true,
      status: true,
      budget: true,
      targetCreator: true,
      targetVideo: true,
      startDate: true,
      endDate: true,
      _count: { select: { affiliates: true, deals: true } },
    },
  })
}

async function getAffiliateContext(affiliateId?: string) {
  if (!affiliateId) return null
  return prisma.affiliate.findFirst({
    where: { id: affiliateId, deletedAt: null },
    include: {
      pic: { select: { name: true } },
      campaign: { select: { name: true, status: true } },
      deals: { where: { deletedAt: null }, take: 5, orderBy: { dealDate: 'desc' } },
      contactHistory: { take: 5, orderBy: { contactDate: 'desc' } },
      reminders: { where: { completed: false }, take: 5 },
    },
  })
}

async function searchAffiliatesByMessage(message: string) {
  const usernameMatch = message.match(/@([\w.]+)/)?.[1]
  if (!usernameMatch) return null

  return prisma.affiliate.findFirst({
    where: { username: { contains: usernameMatch, mode: 'insensitive' }, deletedAt: null },
    select: {
      username: true,
      name: true,
      status: true,
      gmv: true,
      gmvCount: true,
      followers: true,
      lastContactDate: true,
      waContact: true,
    },
  })
}

export async function buildCRMContext(
  userMessage: string,
  pageContext?: CopilotPageContext
): Promise<CRMContextSnapshot> {
  const intents = detectIntents(userMessage)
  const dashboard = await getDashboardMetrics()
  const additional: Record<string, unknown> = {}

  if (pageContext?.affiliateId) {
    additional.focusAffiliate = await getAffiliateContext(pageContext.affiliateId)
  }

  const mentionedAffiliate = await searchAffiliatesByMessage(userMessage)
  if (mentionedAffiliate) additional.mentionedAffiliate = mentionedAffiliate

  if (intents.includes('followups') || intents.includes('workflow')) {
    additional.followUpQueue = await getFollowUpQueue()
  }
  if (intents.includes('sow')) {
    additional.overdueSow = await getOverdueSow()
  }
  if (intents.includes('campaigns')) {
    additional.campaigns = await getCampaignSummary()
  }
  if (intents.includes('blacklist')) {
    additional.blacklistedCount = dashboard.blacklisted
  }

  if (pageContext?.page) {
    additional.currentPage = pageContext.page
  }

  return {
    generatedAt: new Date().toISOString(),
    dashboard,
    additional: Object.keys(additional).length ? additional : undefined,
  }
}

export function formatContextForPrompt(snapshot: CRMContextSnapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

export function buildFallbackResponse(snapshot: CRMContextSnapshot): {
  summary: string
  analysis: string
  insight: string
  recommendation: string
  nextAction: string
} {
  const d = snapshot.dashboard as Record<string, number | unknown>
  const top = (d.topCreators as { username: string; gmv: string | null }[])?.[0]

  return {
    summary: `CRM SJ Kitchen saat ini memiliki ${d.totalAffiliates} affiliate dengan ${d.deals} deal aktif dan conversion rate ${d.conversionRatePct}%.`,
    analysis: `Hari ini: ${d.todayContacts} kontak, ${d.todayDeals} deal baru. Follow-up tertunda: ${d.needFollowUpToday}, re-approach: ${d.needReapproachToday}, SOW overdue: ${d.sowOverdue}. Pertumbuhan affiliate bulan ini: ${d.monthlyGrowthPct}%.`,
    insight: top
      ? `Creator teratas saat ini @${top.username} dengan GMV ${top.gmv || 'N/A'}. ${d.pending} creator belum dihubungi — potensi pipeline besar.`
      : `${d.pending} creator belum dihubungi. ${d.activeCampaigns} campaign aktif berjalan.`,
    recommendation: `Prioritaskan ${d.needFollowUpToday} follow-up yang jatuh tempo dan tindak lanjuti ${d.sowOverdue} SOW overdue untuk mencegah kehilangan revenue.`,
    nextAction: `Mulai dari antrean follow-up hari ini, lalu review ${d.sowDueToday} SOW yang deadline-nya hari ini.`,
  }
}
