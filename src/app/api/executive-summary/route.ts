import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

function getIntervals(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  const intervals: { label: string; start: Date; end: Date }[] = []

  if (diffDays <= 1.5) {
    for (let h = 0; h < 24; h += 4) {
      const iStart = new Date(start)
      iStart.setHours(h, 0, 0, 0)
      const iEnd = new Date(start)
      iEnd.setHours(h + 3, 59, 59, 999)
      intervals.push({
        label: `${String(h).padStart(2, '0')}:00`,
        start: iStart,
        end: iEnd,
      })
    }
  } else if (diffDays <= 14) {
    const temp = new Date(start)
    while (temp <= end) {
      const iStart = new Date(temp)
      iStart.setHours(0, 0, 0, 0)
      const iEnd = new Date(temp)
      iEnd.setHours(23, 59, 59, 999)
      intervals.push({
        label: temp.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        start: iStart,
        end: iEnd,
      })
      temp.setDate(temp.getDate() + 1)
    }
  } else if (diffDays <= 60) {
    const temp = new Date(start)
    let weekNum = 1
    while (temp <= end) {
      const iStart = new Date(temp)
      iStart.setHours(0, 0, 0, 0)
      const iEnd = new Date(temp)
      iEnd.setDate(temp.getDate() + 6)
      iEnd.setHours(23, 59, 59, 999)
      intervals.push({
        label: `Minggu ${weekNum}`,
        start: iStart,
        end: iEnd < end ? iEnd : new Date(end),
      })
      temp.setDate(temp.getDate() + 7)
      weekNum++
    }
  } else {
    const temp = new Date(start)
    while (temp <= end) {
      const iStart = new Date(temp.getFullYear(), temp.getMonth(), 1, 0, 0, 0, 0)
      const iEnd = new Date(temp.getFullYear(), temp.getMonth() + 1, 0, 23, 59, 59, 999)
      intervals.push({
        label: temp.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        start: iStart,
        end: iEnd < end ? iEnd : new Date(end),
      })
      temp.setMonth(temp.getMonth() + 1)
    }
  }

  return intervals
}

async function getPeriodStats(start: Date, end: Date, picId?: string) {
  const picFilter = picId ? { picId } : {}
  const picFilterHist = picId ? { picId } : {}

  const contactedHist = await prisma.contactHistory.findMany({
    where: {
      contactDate: { gte: start, lte: end },
      ...picFilterHist,
    },
    select: { affiliateId: true },
  })
  const uniqueContactedIds = Array.from(new Set(contactedHist.map(h => h.affiliateId)))
  const totalContacted = uniqueContactedIds.length

  const waContacts = 0
  const tiktokContacts = 0
  const instagramContacts = 0

  const [followUp1, followUp2, noResponse, rejected, joined, blacklisted] = await Promise.all([
    prisma.affiliate.count({
      where: {
        status: 'Follow Up 1',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.affiliate.count({
      where: {
        status: 'Follow Up 2',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.affiliate.count({
      where: {
        status: 'No Response',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.affiliate.count({
      where: {
        status: 'Reject',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.affiliate.count({
      where: {
        status: 'Deal',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.affiliate.count({
      where: {
        status: 'Blacklist',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
  ])

  const [totalDeals, activeSow, completedSow, uploadedVideosRaw, revenueRaw, joinedGmvRaw] = await Promise.all([
    prisma.deal.count({
      where: {
        dealDate: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.deal.count({
      where: {
        dealDate: { gte: start, lte: end },
        sowStatus: 'In Progress',
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.deal.count({
      where: {
        updatedAt: { gte: start, lte: end },
        sowStatus: 'Completed',
        deletedAt: null,
        ...picFilter,
      },
    }),
    prisma.deal.aggregate({
      where: {
        dealDate: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
      _sum: { uploadedVideoCount: true },
    }),
    prisma.deal.aggregate({
      where: {
        dealDate: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
      _sum: { nominal: true },
    }),
    prisma.affiliate.aggregate({
      where: {
        status: 'Deal',
        updatedAt: { gte: start, lte: end },
        deletedAt: null,
        ...picFilter,
      },
      _sum: { gmvCount: true },
    }),
  ])

  const videoUploaded = uploadedVideosRaw._sum.uploadedVideoCount || 0
  const revenue = revenueRaw._sum.nominal || 0
  const commission = revenue * 0.1
  const gmv = joinedGmvRaw._sum.gmvCount || 0

  const joinRate = totalContacted > 0 ? (joined / totalContacted) * 100 : 0
  const dealRate = totalContacted > 0 ? (totalDeals / totalContacted) * 100 : 0
  const responseRate = totalContacted > 0 ? ((totalContacted - noResponse) / totalContacted) * 100 : 0
  const totalSow = activeSow + completedSow
  const completionRate = totalSow > 0 ? (completedSow / totalSow) * 100 : 0

  return {
    totalContacted,
    waContacts,
    tiktokContacts,
    instagramContacts,
    followUp1,
    followUp2,
    noResponse,
    rejected,
    joined,
    totalDeals,
    activeSow,
    completedSow,
    blacklisted,
    videoUploaded,
    gmv,
    revenue,
    commission,
    joinRate,
    dealRate,
    responseRate,
    completionRate,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const isStaffOrPic = user.role === 'STAFF' || user.role === 'PIC'
    const searchParams = req.nextUrl.searchParams
    const range = searchParams.get('range') || 'this_month'
    const startStr = searchParams.get('startDate')
    const endStr = searchParams.get('endDate')
    const picIdParam = searchParams.get('picId')

    let finalPicId: string | undefined = undefined
    if (isStaffOrPic) {
      finalPicId = user.id
    } else if (picIdParam) {
      finalPicId = picIdParam
    }

    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (range === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
    } else if (range === 'this_week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      startDate = new Date(now.setDate(diff))
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date()
    } else if (range === 'last_week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7
      startDate = new Date(now.setDate(diff))
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      endDate = new Date()
    } else if (range === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    } else if (range === 'custom' && startStr && endStr) {
      startDate = new Date(startStr)
      endDate = new Date(endStr)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      endDate = new Date()
    }

    const duration = endDate.getTime() - startDate.getTime()
    const prevStartDate = new Date(startDate.getTime() - duration - 1)
    const prevEndDate = new Date(startDate.getTime() - 1)

    const [currentStats, prevStats] = await Promise.all([
      getPeriodStats(startDate, endDate, finalPicId),
      getPeriodStats(prevStartDate, prevEndDate, finalPicId),
    ])

    const kpiKeys = Object.keys(currentStats) as (keyof typeof currentStats)[]
    const statsWithTrend: Record<string, { total: number; change: number }> = {}
    for (const key of kpiKeys) {
      const cur = currentStats[key]
      const prev = prevStats[key]
      const change = prev > 0 ? ((cur - prev) / prev) * 100 : 0
      statsWithTrend[key] = {
        total: cur,
        change: parseFloat(change.toFixed(1)),
      }
    }

    const intervals = getIntervals(startDate, endDate)

    const picFilter = finalPicId ? { picId: finalPicId } : {}
    const picFilterHist = finalPicId ? { picId: finalPicId } : {}

    const [contactHistories, affiliates, deals, completedDeals] = await Promise.all([
      prisma.contactHistory.findMany({
        where: {
          contactDate: { gte: startDate, lte: endDate },
          ...picFilterHist,
        },
      }),
      prisma.affiliate.findMany({
        where: {
          updatedAt: { gte: startDate, lte: endDate },
          deletedAt: null,
          ...picFilter,
        },
      }),
      prisma.deal.findMany({
        where: {
          dealDate: { gte: startDate, lte: endDate },
          deletedAt: null,
          ...picFilter,
        },
      }),
      prisma.deal.findMany({
        where: {
          updatedAt: { gte: startDate, lte: endDate },
          sowStatus: 'Completed',
          deletedAt: null,
          ...picFilter,
        },
      }),
    ])

    const summaryTableData = intervals.map(i => {
      const intervalContacts = contactHistories.filter(c => c.contactDate >= i.start && c.contactDate <= i.end)
      const intervalAffiliates = affiliates.filter(a => a.updatedAt >= i.start && a.updatedAt <= i.end)
      const intervalDeals = deals.filter(d => d.dealDate >= i.start && d.dealDate <= i.end)
      const intervalCompletedDeals = completedDeals.filter(d => d.updatedAt >= i.start && d.updatedAt <= i.end)

      const wa = 0
      const dm = 0
      const tiktok = 0
      const fu1 = intervalAffiliates.filter(a => a.status === 'Follow Up 1').length
      const fu2 = intervalAffiliates.filter(a => a.status === 'Follow Up 2').length
      const noResp = intervalAffiliates.filter(a => a.status === 'No Response').length
      const rej = intervalAffiliates.filter(a => a.status === 'Reject').length
      const join = intervalAffiliates.filter(a => a.status === 'Deal').length
      const deal = intervalDeals.length
      const sample = intervalDeals.filter(d => d.sampleSentDate !== null).length
      const uploaded = intervalDeals.reduce((sum, d) => sum + d.uploadedVideoCount, 0)
      const complete = intervalCompletedDeals.length
      const blacklist = intervalAffiliates.filter(a => a.status === 'Blacklist').length

      return {
        label: i.label,
        contactsWa: wa,
        contactsDm: dm,
        contactsTiktok: tiktok,
        followUp1: fu1,
        followUp2: fu2,
        noResponse: noResp,
        reject: rej,
        join,
        deal,
        sampleSent: sample,
        videoUploaded: uploaded,
        sowComplete: complete,
        blacklist,
      }
    })

    const funnelStages = [
      { name: 'Prospect Imported', count: await prisma.affiliate.count({ where: { deletedAt: null, ...picFilter } }) },
      { name: 'Contacted', count: currentStats.totalContacted },
      { name: 'Responded', count: currentStats.totalContacted - currentStats.noResponse },
      { name: 'Negotiation', count: await prisma.affiliate.count({ where: { status: 'Negotiation', deletedAt: null, ...picFilter } }) },
      { name: 'Deal Joined', count: currentStats.joined },
      { name: 'Sample Sent', count: deals.filter(d => d.sampleSentDate !== null).length },
      { name: 'Video Uploaded', count: deals.filter(d => d.uploadedVideoCount > 0).length },
      { name: 'Completed SOW', count: currentStats.completedSow },
    ]

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, role: true },
    })

    const userLeaderboardRaw = await Promise.all(
      users.map(async u => {
        const uPicFilter = { picId: u.id }

        const uContactCount = await prisma.contactHistory.count({
          where: { picId: u.id, contactDate: { gte: startDate, lte: endDate } },
        })

        const uNoResponse = await prisma.affiliate.count({
          where: { picId: u.id, status: 'No Response', updatedAt: { gte: startDate, lte: endDate }, deletedAt: null },
        })

        const uJoin = await prisma.affiliate.count({
          where: { picId: u.id, status: 'Deal', updatedAt: { gte: startDate, lte: endDate }, deletedAt: null },
        })

        const uDeals = await prisma.deal.count({
          where: { picId: u.id, dealDate: { gte: startDate, lte: endDate }, deletedAt: null },
        })

        const uReject = await prisma.affiliate.count({
          where: { picId: u.id, status: 'Reject', updatedAt: { gte: startDate, lte: endDate }, deletedAt: null },
        })

        const uGmvRaw = await prisma.affiliate.aggregate({
          where: { picId: u.id, status: 'Deal', updatedAt: { gte: startDate, lte: endDate }, deletedAt: null },
          _sum: { gmvCount: true },
        })
        const gmv = uGmvRaw._sum.gmvCount || 0

        const uRevRaw = await prisma.deal.aggregate({
          where: { picId: u.id, dealDate: { gte: startDate, lte: endDate }, deletedAt: null },
          _sum: { nominal: true },
        })
        const revenue = uRevRaw._sum.nominal || 0
        const commission = revenue * 0.1

        const uCompletedSow = await prisma.deal.count({
          where: { picId: u.id, sowStatus: 'Completed', updatedAt: { gte: startDate, lte: endDate }, deletedAt: null },
        })
        const completionRate = uDeals > 0 ? (uCompletedSow / uDeals) * 100 : 0

        return {
          name: u.name,
          role: u.role,
          totalContact: uContactCount,
          totalResponse: Math.max(0, uContactCount - uNoResponse),
          join: uJoin,
          deals: uDeals,
          reject: uReject,
          noResponse: uNoResponse,
          gmv,
          revenue,
          commission,
          completionRate: parseFloat(completionRate.toFixed(1)),
          averageResponse: '1.2 jam',
        }
      })
    )

    const userLeaderboard = userLeaderboardRaw
      .filter(u => u.totalContact > 0 || u.deals > 0)
      .sort((a, b) => b.revenue - a.revenue)

    const trends = summaryTableData.map(d => ({
      name: d.label,
      contact: d.contactsWa + d.contactsDm + d.contactsTiktok,
      join: d.join,
      deal: d.deal,
      gmv: d.join * 20000000,
      revenue: d.deal * 1500000,
      commission: d.deal * 150000,
      sowComplete: d.sowComplete,
    }))

    const topCreators = await prisma.affiliate.findMany({
      where: { deletedAt: null, ...picFilter },
      orderBy: { gmvCount: 'desc' },
      take: 10,
      select: { username: true, name: true, followers: true, gmv: true, gmvCount: true },
    })

    const topCampaignsRaw = await prisma.deal.groupBy({
      by: ['campaignId'],
      where: { deletedAt: null, ...picFilter },
      _count: { id: true },
      _sum: { nominal: true },
      orderBy: { _sum: { nominal: 'desc' } },
      take: 5,
    })
    const topCampaigns = await Promise.all(
      topCampaignsRaw.map(async tc => {
        const camp = await prisma.campaign.findUnique({ where: { id: tc.campaignId } })
        return {
          name: camp?.name || 'Unknown',
          deals: tc._count.id,
          revenue: tc._sum.nominal || 0,
        }
      })
    )

    const bottomListNeedFollowUp = await prisma.affiliate.findMany({
      where: {
        status: { in: ['Follow Up 1', 'Follow Up 2'] },
        deletedAt: null,
        ...picFilter,
      },
      orderBy: { lastContactDate: 'asc' },
      take: 5,
      select: { username: true, status: true, lastContactDate: true },
    })

    const bottomListNoResponse = await prisma.affiliate.findMany({
      where: {
        status: 'No Response',
        deletedAt: null,
        ...picFilter,
      },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: { username: true, updatedAt: true },
    })

    const bottomListOverdueSow = await prisma.deal.findMany({
      where: {
        sowStatus: 'Overdue',
        deletedAt: null,
        ...picFilter,
      },
      orderBy: { deadline: 'asc' },
      take: 5,
      select: { product: true, deadline: true, affiliate: { select: { username: true } } },
    })

    const bottomListNoVideo = await prisma.deal.findMany({
      where: {
        uploadedVideoCount: 0,
        deletedAt: null,
        ...picFilter,
      },
      take: 5,
      select: { product: true, affiliate: { select: { username: true } } },
    })

    const bottomListBlacklist = await prisma.affiliate.findMany({
      where: {
        status: 'Blacklist',
        deletedAt: null,
        ...picFilter,
      },
      take: 5,
      select: { username: true, blacklistReason: true },
    })

    const activities = await prisma.activity.findMany({
      where: finalPicId ? { userId: finalPicId } : undefined,
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        affiliate: { select: { username: true } },
      },
    })
    const timeline = activities.map(a => ({
      id: a.id,
      user: a.user?.name || 'System',
      action: a.action,
      details: a.details,
      creator: a.affiliate?.username || '',
      time: a.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      stats: statsWithTrend,
      summaryTable: summaryTableData,
      funnel: funnelStages,
      leaderboard: userLeaderboard,
      trends,
      topCreators,
      topCampaigns,
      bottomLists: {
        needFollowUp: bottomListNeedFollowUp,
        noResponse: bottomListNoResponse,
        overdueSow: bottomListOverdueSow,
        noVideo: bottomListNoVideo,
        blacklist: bottomListBlacklist,
      },
      timeline,
      user: {
        name: user.name,
        role: user.role,
        isManagerOrAdmin: !isStaffOrPic,
      },
    })
  } catch (error: any) {
    console.error('Executive summary API error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
