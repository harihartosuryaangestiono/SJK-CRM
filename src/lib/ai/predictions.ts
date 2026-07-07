import prisma from '@/lib/prisma'

export type Prediction = {
  id: string
  type: 'revenue' | 'gmv' | 'deal_probability' | 'sow_completion' | 'churn' | 'top_performer'
  title: string
  value: string
  confidence: 'high' | 'medium' | 'low'
  confidencePct: number
  reasoning: string
  affiliateUsername?: string
  href?: string
}

function confidenceFromSampleSize(n: number): { level: 'high' | 'medium' | 'low'; pct: number } {
  if (n >= 30) return { level: 'high', pct: 85 }
  if (n >= 10) return { level: 'medium', pct: 65 }
  return { level: 'low', pct: 45 }
}

export async function generatePredictions(): Promise<Prediction[]> {
  const now = new Date()
  const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const last6Months = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  const predictions: Prediction[] = []

  // Monthly deal counts for trend (last 6 months)
  const monthlyDeals = await prisma.deal.findMany({
    where: { deletedAt: null, dealDate: { gte: last6Months } },
    select: { dealDate: true, nominal: true },
  })

  const dealsByMonth: number[] = []
  const revenueByMonth: number[] = []
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthDeals = monthlyDeals.filter(d => d.dealDate >= mStart && d.dealDate <= mEnd)
    dealsByMonth.push(monthDeals.length)
    revenueByMonth.push(monthDeals.reduce((s, d) => s + d.nominal, 0))
  }

  const sampleSize = monthlyDeals.length
  const conf = confidenceFromSampleSize(sampleSize)

  // Simple linear projection for next month deals
  const recentDeals = dealsByMonth.slice(-3)
  const avgRecentDeals = recentDeals.reduce((a, b) => a + b, 0) / Math.max(recentDeals.length, 1)
  const dealTrend = recentDeals.length >= 2 ? recentDeals[recentDeals.length - 1] - recentDeals[0] : 0
  const predictedDeals = Math.max(0, Math.round(avgRecentDeals + dealTrend / 2))

  predictions.push({
    id: 'pred-deals',
    type: 'revenue',
    title: 'Prediksi Deal Bulan Depan',
    value: `~${predictedDeals} deal`,
    confidence: conf.level,
    confidencePct: conf.pct,
    reasoning: `Berdasarkan rata-rata ${avgRecentDeals.toFixed(1)} deal/bulan (${sampleSize} data point 6 bulan terakhir).`,
  })

  // Revenue projection
  const recentRev = revenueByMonth.slice(-3)
  const avgRev = recentRev.reduce((a, b) => a + b, 0) / Math.max(recentRev.length, 1)
  const revTrend = recentRev.length >= 2 ? recentRev[recentRev.length - 1] - recentRev[0] : 0
  const predictedRev = Math.max(0, avgRev + revTrend / 2)

  predictions.push({
    id: 'pred-revenue',
    type: 'revenue',
    title: 'Prediksi Revenue Bulan Depan',
    value: `~Rp ${Math.round(predictedRev).toLocaleString('id-ID')}`,
    confidence: conf.level,
    confidencePct: conf.pct,
    reasoning: `Trend revenue 3 bulan terakhir dengan ${sampleSize} deal historis.`,
  })

  // GMV projection from affiliate aggregate
  const gmvAgg = await prisma.affiliate.aggregate({
    where: { deletedAt: null, gmvCount: { gt: 0 } },
    _sum: { gmvCount: true },
    _avg: { gmvCount: true },
    _count: { id: true },
  })

  const totalGmv = gmvAgg._sum.gmvCount || 0
  const gmvConf = confidenceFromSampleSize(gmvAgg._count.id)
  const growthFactor = dealsByMonth.length >= 2 && dealsByMonth[dealsByMonth.length - 1] > dealsByMonth[dealsByMonth.length - 2] ? 1.08 : 1.02

  predictions.push({
    id: 'pred-gmv',
    type: 'gmv',
    title: 'Prediksi GMV Bulan Depan',
    value: `~Rp ${Math.round(totalGmv * growthFactor / 1_000_000).toLocaleString('id-ID')} jt`,
    confidence: gmvConf.level,
    confidencePct: gmvConf.pct,
    reasoning: `Total GMV saat ini Rp ${totalGmv.toLocaleString('id-ID')} dari ${gmvAgg._count.id} creator dengan data GMV.`,
  })

  // Deal probability for negotiation pipeline
  const negotiationCount = await prisma.affiliate.count({
    where: { deletedAt: null, status: 'Negotiation' },
  })
  const historicalNegotiationClose = await prisma.statusHistory.count({
    where: { newStatus: 'Deal', oldStatus: 'Negotiation', changedAt: { gte: last3Months } },
  })
  const totalNegotiationHistory = await prisma.statusHistory.count({
    where: { oldStatus: 'Negotiation', changedAt: { gte: last3Months } },
  })
  const closeRate = totalNegotiationHistory > 0
    ? Math.round((historicalNegotiationClose / totalNegotiationHistory) * 100)
    : 35

  predictions.push({
    id: 'pred-deal-prob',
    type: 'deal_probability',
    title: 'Probabilitas Close Negotiation',
    value: `${closeRate}%`,
    confidence: totalNegotiationHistory >= 10 ? 'medium' : 'low',
    confidencePct: totalNegotiationHistory >= 10 ? 60 : 40,
    reasoning: `${negotiationCount} creator saat ini di Negotiation. Historical close rate: ${closeRate}% (${historicalNegotiationClose}/${totalNegotiationHistory}).`,
    href: '/progress',
  })

  // SOW completion probability
  const inProgressDeals = await prisma.deal.findMany({
    where: { deletedAt: null, sowStatus: { in: ['In Progress', 'Overdue'] } },
    select: { uploadedVideoCount: true, targetVideo: true, progressCampaign: true },
  })

  let sowProb = 70
  if (inProgressDeals.length > 0) {
    const avgProgress = inProgressDeals.reduce((s, d) => {
      const target = Math.max(d.targetVideo, 1)
      return s + d.uploadedVideoCount / target
    }, 0) / inProgressDeals.length
    sowProb = Math.round(avgProgress * 100)
  }

  predictions.push({
    id: 'pred-sow',
    type: 'sow_completion',
    title: 'Probabilitas SOW Completion',
    value: `${sowProb}%`,
    confidence: inProgressDeals.length >= 5 ? 'medium' : 'low',
    confidencePct: inProgressDeals.length >= 5 ? 65 : 45,
    reasoning: `${inProgressDeals.length} SOW aktif. Rata-rata progress video upload.`,
    href: '/sow',
  })

  // Churn risk
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)
  const churnRisk = await prisma.affiliate.findMany({
    where: {
      deletedAt: null,
      status: { in: ['Deal', 'Follow Up 1', 'Follow Up 2', 'No Response'] },
      lastContactDate: { lt: sixtyDaysAgo },
    },
    take: 5,
    orderBy: { gmvCount: 'desc' },
    select: { id: true, username: true, gmv: true },
  })

  predictions.push({
    id: 'pred-churn',
    type: 'churn',
    title: 'Creator Berisiko Churn',
    value: `${churnRisk.length}+ creator`,
    confidence: churnRisk.length > 0 ? 'medium' : 'low',
    confidencePct: 55,
    reasoning: churnRisk.length > 0
      ? `Creator deal/follow-up tanpa kontak >60 hari. Top: @${churnRisk[0]?.username}.`
      : 'Tidak ada creator deal dengan risiko churn signifikan.',
    affiliateUsername: churnRisk[0]?.username,
    href: churnRisk[0] ? `/affiliates/${churnRisk[0].id}` : '/contact',
  })

  // Future top performer
  const risingStars = await prisma.affiliate.findMany({
    where: {
      deletedAt: null,
      status: { in: ['Negotiation', 'Deal', 'Follow Up 1', 'Follow Up 2'] },
      gmvCount: { gte: 10_000_000 },
    },
    orderBy: { gmvCount: 'desc' },
    take: 1,
    select: { id: true, username: true, gmv: true, followers: true },
  })

  if (risingStars[0]) {
    predictions.push({
      id: 'pred-top',
      type: 'top_performer',
      title: 'Future Top Performer',
      value: `@${risingStars[0].username}`,
      confidence: 'medium',
      confidencePct: 70,
      reasoning: `GMV ${risingStars[0].gmv || 'N/A'}, followers ${risingStars[0].followers || 'N/A'}, status aktif pipeline.`,
      affiliateUsername: risingStars[0].username,
      href: `/affiliates/${risingStars[0].id}`,
    })
  }

  return predictions
}
