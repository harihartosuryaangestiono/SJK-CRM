import prisma from '@/lib/prisma'
import type { AIInsight } from './types'

export type { AIInsight } from './types'

export async function generateInsights(): Promise<AIInsight[]> {
  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    totalAffiliates,
    contacted,
    deals,
    pending,
    newThisMonth,
    newLastMonth,
    sowOverdue,
    needFollowUpToday,
    blacklisted,
    todayContacts,
    todayDeals,
    inactiveCreators,
    noVideoDeals,
  ] = await Promise.all([
    prisma.affiliate.count({ where: { deletedAt: null } }),
    prisma.affiliate.count({ where: { status: { not: 'Belum Dihubungi' }, deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Deal', deletedAt: null } }),
    prisma.affiliate.count({ where: { status: 'Belum Dihubungi', deletedAt: null } }),
    prisma.affiliate.count({ where: { createdAt: { gte: thisMonthStart }, deletedAt: null } }),
    prisma.affiliate.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart }, deletedAt: null } }),
    prisma.deal.count({ where: { deletedAt: null, sowStatus: 'Overdue' } }),
    prisma.reminder.count({ where: { type: { in: ['FOLLOW_UP', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] }, completed: false, dueDate: { lte: now } } }),
    prisma.affiliate.count({ where: { status: 'Blacklist', deletedAt: null } }),
    prisma.contactHistory.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.deal.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
    prisma.affiliate.count({
      where: {
        deletedAt: null,
        status: { notIn: ['Blacklist', 'Tidak Relevan', 'Reject'] },
        OR: [
          { lastContactDate: { lt: thirtyDaysAgo } },
          { lastContactDate: null, createdAt: { lt: thirtyDaysAgo } },
        ],
      },
    }),
    prisma.deal.count({ where: { deletedAt: null, uploadedVideoCount: 0, sowStatus: { not: 'Completed' } } }),
  ])

  const conversionRate = contacted > 0 ? (deals / contacted) * 100 : 0
  const monthlyGrowth = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0

  const topCreator = await prisma.affiliate.findFirst({
    where: { deletedAt: null },
    orderBy: { gmvCount: 'desc' },
    select: { id: true, username: true, gmv: true, gmvCount: true },
  })

  const insights: AIInsight[] = []

  if (monthlyGrowth > 0) {
    insights.push({
      id: 'growth-up',
      type: 'positive',
      title: 'Pertumbuhan Affiliate',
      message: `Affiliate baru naik ${monthlyGrowth.toFixed(1)}% dibanding bulan lalu (${newThisMonth} vs ${newLastMonth}).`,
      metric: `+${monthlyGrowth.toFixed(1)}%`,
      action: 'Percepat onboarding creator baru ke campaign aktif.',
      href: '/affiliates',
    })
  } else if (newLastMonth > 0 && monthlyGrowth < 0) {
    insights.push({
      id: 'growth-down',
      type: 'warning',
      title: 'Penurunan Affiliate Baru',
      message: `Affiliate baru turun ${Math.abs(monthlyGrowth).toFixed(1)}% dibanding bulan lalu.`,
      metric: `${monthlyGrowth.toFixed(1)}%`,
      action: 'Review sumber listing dan perluas pipeline prospect.',
      href: '/affiliates',
    })
  }

  insights.push({
    id: 'conversion',
    type: conversionRate >= 15 ? 'positive' : conversionRate >= 8 ? 'info' : 'warning',
    title: 'Conversion Rate',
    message: `Tingkat konversi deal dari contacted: ${conversionRate.toFixed(1)}% (${deals} deal / ${contacted} contacted).`,
    metric: `${conversionRate.toFixed(1)}%`,
    action: conversionRate < 10 ? 'Fokus follow-up pada creator di status Negotiation.' : 'Pertahankan momentum deal closing.',
    href: '/progress',
  })

  if (topCreator) {
    const totalGmv = await prisma.affiliate.aggregate({ where: { deletedAt: null }, _sum: { gmvCount: true } })
    const share = totalGmv._sum.gmvCount && totalGmv._sum.gmvCount > 0
      ? ((topCreator.gmvCount / totalGmv._sum.gmvCount) * 100).toFixed(0)
      : '0'
    insights.push({
      id: 'top-creator',
      type: 'info',
      title: 'Top Performer GMV',
      message: `@${topCreator.username} memimpin dengan GMV ${topCreator.gmv || 'N/A'} (~${share}% total).`,
      metric: topCreator.gmv || undefined,
      action: 'Pertimbangkan repeat deal atau premium campaign untuk top performer.',
      href: `/affiliates/${topCreator.id}`,
    })
  }

  if (sowOverdue > 0) {
    insights.push({
      id: 'sow-overdue',
      type: 'critical',
      title: 'SOW Overdue',
      message: `${sowOverdue} deal memiliki SOW yang melewati deadline.`,
      metric: String(sowOverdue),
      action: 'Hubungi creator terkait dan kirim reminder SOW segera.',
      href: '/sow',
    })
  }

  if (needFollowUpToday > 0) {
    insights.push({
      id: 'followup-due',
      type: 'warning',
      title: 'Follow Up Jatuh Tempo',
      message: `${needFollowUpToday} creator perlu follow-up hari ini.`,
      metric: String(needFollowUpToday),
      action: 'Mulai outreach dari Contact Hub.',
      href: '/contact',
    })
  }

  if (inactiveCreators > 0) {
    insights.push({
      id: 'inactive',
      type: 'warning',
      title: 'Creator Tidak Aktif',
      message: `${inactiveCreators} creator tidak dihubungi lebih dari 30 hari.`,
      metric: String(inactiveCreators),
      action: 'Jadwalkan re-approach untuk reaktivasi pipeline.',
      href: '/contact',
    })
  }

  if (noVideoDeals > 0) {
    insights.push({
      id: 'no-video',
      type: 'warning',
      title: 'Deal Tanpa Video',
      message: `${noVideoDeals} deal aktif belum upload video sama sekali.`,
      metric: String(noVideoDeals),
      action: 'Kirim reminder upload video ke creator terkait.',
      href: '/progress',
    })
  }

  if (pending > totalAffiliates * 0.4 && totalAffiliates > 10) {
    insights.push({
      id: 'pipeline-backlog',
      type: 'info',
      title: 'Backlog Outreach',
      message: `${pending} creator (${((pending / totalAffiliates) * 100).toFixed(0)}%) belum pernah dihubungi.`,
      metric: String(pending),
      action: 'Alokasikan sesi outreach harian untuk mengurangi backlog.',
      href: '/contact',
    })
  }

  if (todayContacts > 0 || todayDeals > 0) {
    insights.push({
      id: 'today-activity',
      type: 'positive',
      title: 'Aktivitas Hari Ini',
      message: `${todayContacts} kontak dan ${todayDeals} deal baru tercatat hari ini.`,
      metric: `${todayContacts}/${todayDeals}`,
      action: 'Pertahankan momentum outreach harian.',
    })
  }

  if (blacklisted > 0) {
    insights.push({
      id: 'blacklist',
      type: 'info',
      title: 'Creator Blacklist',
      message: `${blacklisted} creator saat ini dalam status blacklist.`,
      metric: String(blacklisted),
      action: 'Review blacklist bulanan untuk keputusan re-approach.',
      href: '/blacklist',
    })
  }

  return insights.slice(0, 8)
}
