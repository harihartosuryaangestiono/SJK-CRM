import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { CampaignStatus } from '@prisma/client'
import { getSessionUser } from '@/lib/auth'

// ─── Helper: group records by month label ─────────────────────────────────────
function groupByMonth(records: { date: Date }[], monthsBack = 6) {
  const now = new Date()
  const months: { label: string; year: number; month: number }[] = []

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleString('id-ID', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }

  return months.map(m => ({
    month: m.label,
    count: records.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === m.year && d.getMonth() === m.month
    }).length,
  }))
}

// ─── Helper: group contact history by weekday (last 7 days) ───────────────────
function groupByWeekday(records: { date: Date; isDeal?: boolean }[]) {
  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const now = new Date()
  const results = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayLabel = DAYS[d.getDay()]
    const dayRecords = records.filter(r => {
      const rd = new Date(r.date)
      return rd.toDateString() === d.toDateString()
    })
    results.push({
      day: dayLabel,
      contacted: dayRecords.length,
      deals: dayRecords.filter(r => r.isDeal).length,
    })
  }
  return results
}

export async function GET() {
  try {
    await getSessionUser() // Auth check — will throw on session error, not on no-session

    const now = new Date()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // ── 1. Core affiliate metrics ──────────────────────────────────────────────
    const [
      totalAffiliates,
      activeAffiliates,
      newThisMonth,
      newLastMonth,
      contacted,
      tidakRelevan,
      followUp,
      negotiation,
      deals,
      reject,
      pending,
      activeCampaigns,
    ] = await Promise.all([
      prisma.affiliate.count({ where: { deletedAt: null } }),
      prisma.affiliate.count({ where: { status: 'Deal', deletedAt: null } }),
      prisma.affiliate.count({ where: { createdAt: { gte: thisMonthStart }, deletedAt: null } }),
      prisma.affiliate.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart }, deletedAt: null } }),
      prisma.affiliate.count({ where: { status: { not: 'Belum Dihubungi' }, deletedAt: null } }),
      prisma.affiliate.count({ where: { status: 'Tidak Relevan', deletedAt: null } }),
      prisma.affiliate.count({ where: { status: { in: ['Follow Up 1', 'Follow Up 2'] }, deletedAt: null } }),
      prisma.affiliate.count({ where: { status: 'Negotiation', deletedAt: null } }),
      prisma.affiliate.count({ where: { status: 'Deal', deletedAt: null } }),
      prisma.affiliate.count({ where: { status: 'Reject', deletedAt: null } }),
      prisma.affiliate.count({ where: { status: 'Belum Dihubungi', deletedAt: null } }),
      prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE, deletedAt: null } }),
    ])

    // ── 2. Today's metrics ─────────────────────────────────────────────────────
    const [todayContacts, todayDealsCount] = await Promise.all([
      prisma.contactHistory.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.deal.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
    ])

    const todayFollowUps = await prisma.reminder.count({
      where: {
        type: { in: ['FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP'] },
        completed: false,
        dueDate: { lte: now },
      },
    })

    // ── 3. SOW & Workflow metrics ──────────────────────────────────────────────
    const [
      needFollowUpToday,
      needReapproachToday,
      sowDueToday,
      sowOverdue,
      blacklistedCreator,
      creatorUploadedToday,
      creatorCompletedSow,
    ] = await Promise.all([
      prisma.reminder.count({
        where: { type: { in: ['FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP'] }, completed: false, dueDate: { lte: now } },
      }),
      prisma.reminder.count({ where: { type: 'RE_APPROACH', completed: false, dueDate: { lte: now } } }),
      prisma.deal.count({
        where: {
          deletedAt: null,
          sowStatus: { not: 'Completed' },
          deadline: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.deal.count({ where: { deletedAt: null, sowStatus: 'Overdue' } }),
      prisma.affiliate.count({ where: { status: 'Blacklist', deletedAt: null } }),
      prisma.deal.count({
        where: { deletedAt: null, uploadedVideoCount: { gte: 1 }, updatedAt: { gte: todayStart } },
      }),
      prisma.deal.count({ where: { deletedAt: null, sowStatus: 'Completed' } }),
    ])

    // ── 4. Reminder counts ────────────────────────────────────────────────────
    const [followUpCount, reapproachCount, deadlinesCount] = await Promise.all([
      prisma.reminder.count({ where: { type: { in: ['FOLLOW_UP', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] }, completed: false } }),
      prisma.reminder.count({ where: { type: 'RE_APPROACH', completed: false } }),
      prisma.reminder.count({
        where: { type: { in: ['DEADLINE', 'SOW_LAST_WARNING', 'SOW_OVERDUE'] }, completed: false },
      }),
    ])

    // ── 5. Top creators, campaign, PIC ───────────────────────────────────────
    const topCreators = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      take: 5,
      orderBy: { gmvCount: 'desc' },
      select: { username: true, followers: true, gmv: true, gmvCount: true, status: true },
    })

    const topGmvCreatorObj = topCreators[0]
    const topGmvCreator = topGmvCreatorObj ? `@${topGmvCreatorObj.username}` : 'N/A'

    const campaignDealsCount = await prisma.deal.groupBy({
      by: ['campaignId'],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    })
    let topCampaignName = 'N/A'
    if (campaignDealsCount.length > 0) {
      const topCam = await prisma.campaign.findUnique({ where: { id: campaignDealsCount[0].campaignId } })
      if (topCam) topCampaignName = topCam.name
    }

    const picDealsCount = await prisma.deal.groupBy({
      by: ['picId'],
      where: { deletedAt: null, picId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    })
    let topPicName = 'N/A'
    if (picDealsCount.length > 0 && picDealsCount[0].picId) {
      const topUser = await prisma.user.findUnique({ where: { id: picDealsCount[0].picId } })
      if (topUser) topPicName = topUser.name
    }

    // ── 6. Conversion rates ───────────────────────────────────────────────────
    const conversionRate = contacted > 0 ? (deals / contacted) * 100 : 0
    const responseRate = contacted > 0 ? ((contacted - tidakRelevan) / contacted) * 100 : 0
    const monthlyGrowth = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0

    // Repeat creator rate: affiliates with >1 deal / total affiliates with deals
    const dealAffiliateGroups = await prisma.deal.groupBy({
      by: ['affiliateId'],
      where: { deletedAt: null },
      _count: { id: true },
    })
    const repeatCreators = dealAffiliateGroups.filter(g => g._count.id > 1).length
    const totalDealAffiliates = dealAffiliateGroups.length
    const repeatCreatorRate = totalDealAffiliates > 0
      ? parseFloat(((repeatCreators / totalDealAffiliates) * 100).toFixed(1))
      : 0

    // Average response time: mean hours from affiliate createdAt to lastContactDate
    const contactedAffiliates = await prisma.affiliate.findMany({
      where: { deletedAt: null, lastContactDate: { not: null } },
      select: { createdAt: true, lastContactDate: true },
      take: 100,
    })
    let averageResponseTime = 'N/A'
    if (contactedAffiliates.length > 0) {
      const totalHours = contactedAffiliates.reduce((sum, a) => {
        const hours = (new Date(a.lastContactDate!).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60)
        return sum + Math.max(0, hours)
      }, 0)
      const avg = totalHours / contactedAffiliates.length
      averageResponseTime = avg < 24 ? `${avg.toFixed(1)} jam` : `${(avg / 24).toFixed(1)} hari`
    }

    // Average deal time: mean days from affiliate createdAt to deal date
    const dealAffiliatesWithDate = await prisma.deal.findMany({
      where: { deletedAt: null },
      include: { affiliate: { select: { createdAt: true } } },
      take: 100,
    })
    let averageDealTime = 'N/A'
    if (dealAffiliatesWithDate.length > 0) {
      const totalDays = dealAffiliatesWithDate.reduce((sum, d) => {
        const days = (new Date(d.dealDate).getTime() - new Date(d.affiliate.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        return sum + Math.max(0, days)
      }, 0)
      const avg = totalDays / dealAffiliatesWithDate.length
      averageDealTime = `${avg.toFixed(1)} hari`
    }

    // ── 7. REAL chart data ────────────────────────────────────────────────────

    // 7a. Weekly outreach (last 7 days) from ContactHistory
    const recentContacts = await prisma.contactHistory.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, affiliate: { select: { status: true } } },
    })
    const recentDeals = await prisma.deal.findMany({
      where: { dealDate: { gte: sevenDaysAgo }, deletedAt: null },
      select: { dealDate: true },
    })
    const outreachData = groupByWeekday([
      ...recentContacts.map(c => ({ date: c.createdAt, isDeal: false })),
    ])
    // Merge deals into the outreach data
    const dealsByDay = groupByWeekday(recentDeals.map(d => ({ date: d.dealDate, isDeal: true })))
    const outreachChart = outreachData.map((o, i) => ({
      day: o.day,
      contacted: o.contacted,
      deals: dealsByDay[i]?.contacted ?? 0,
    }))

    // 7b. Monthly deals (last 6 months)
    const allDeals = await prisma.deal.findMany({
      where: { dealDate: { gte: sixMonthsAgo }, deletedAt: null },
      select: { dealDate: true },
    })
    const dealsMonthlyChart = groupByMonth(
      allDeals.map(d => ({ date: d.dealDate }))
    ).map(m => ({ month: m.month, deals: m.count }))

    // 7c. Affiliate growth (last 6 months)
    const allAffiliatesHistory = await prisma.affiliate.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null },
      select: { createdAt: true },
    })
    // Compute cumulative growth
    const growthMonthly = groupByMonth(allAffiliatesHistory.map(a => ({ date: a.createdAt })))
    let runningTotal = await prisma.affiliate.count({
      where: { createdAt: { lt: sixMonthsAgo }, deletedAt: null },
    })
    const growthChart = growthMonthly.map(m => {
      runningTotal += m.count
      return { month: m.month, total: runningTotal }
    })

    // ── 8. Timeline activities ─────────────────────────────────────────────────
    const activities = await prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        affiliate: { select: { username: true, name: true } },
        user: { select: { name: true } },
      },
    })
    const formattedTimeline = activities.map(act => ({
      id: act.id,
      user: act.user?.name || 'System',
      action: act.action,
      details: act.details,
      time: act.createdAt.toISOString(),
      creator: act.affiliate?.username || '',
    }))

    return NextResponse.json({
      success: true,
      source: 'database',
      stats: {
        totalAffiliates,
        activeAffiliates,
        newThisMonth,
        contacted,
        tidakRelevan,
        followUp,
        reapproach: reapproachCount,
        deals,
        reject,
        pending,
        activeCampaigns,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        responseRate: parseFloat(responseRate.toFixed(1)),
        todayContacts,
        todayFollowUps,
        todayDealsCount,
        averageResponseTime,
        averageDealTime,
        topCampaign: topCampaignName,
        topPIC: topPicName,
        topCreator: topGmvCreator,
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
        repeatCreatorRate,
        needFollowUpToday,
        needReapproachToday,
        sowDueToday,
        sowOverdue,
        blacklistedCreator,
        creatorUploadedToday,
        creatorCompletedSow,
        topGmvCreator,
      },
      funnel: [
        { name: 'Prospect', count: totalAffiliates, fill: '#374151' },
        { name: 'Contacted', count: contacted, fill: '#4b5563' },
        { name: 'Tidak Relevan', count: tidakRelevan, fill: '#f97316' },
        { name: 'Follow Up', count: followUp, fill: '#3b82f6' },
        { name: 'Negotiation', count: negotiation, fill: '#a855f7' },
        { name: 'Deal', count: deals, fill: '#10b981' },
      ],
      charts: {
        outreach: outreachChart,
        dealsMonthly: dealsMonthlyChart,
        creatorPerformance: topCreators.map(tc => ({
          name: tc.username,
          gmv: parseFloat((tc.gmvCount / 1_000_000).toFixed(2)),
        })),
        growth: growthChart,
      },
      timeline: formattedTimeline,
      reminders: { followUpCount, reapproachCount, deadlinesCount },
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json(
      { success: false, message: 'Failed to load dashboard data. Please try again.' },
      { status: 500 }
    )
  }
}
