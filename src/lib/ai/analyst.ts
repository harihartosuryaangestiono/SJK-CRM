import prisma from '@/lib/prisma'
import type { MetricComparison } from './types'

export type { MetricComparison } from './types'

export type BusinessAnalytics = {
  generatedAt: string
  comparisons: MetricComparison[]
  summary: string
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return parseFloat((((current - previous) / previous) * 100).toFixed(1))
}

function trend(current: number, previous: number): 'up' | 'down' | 'flat' {
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'flat'
}

export async function generateBusinessAnalytics(): Promise<BusinessAnalytics> {
  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(thisWeekStart.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart.getTime() - 1)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1)

  const [
    contactsToday,
    contactsYesterday,
    dealsThisWeek,
    dealsLastWeek,
    dealsThisMonth,
    dealsLastMonth,
    revenueThisMonth,
    revenueLastMonth,
    affiliatesThisMonth,
    affiliatesLastMonth,
    contactedThisMonth,
    contactedLastMonth,
  ] = await Promise.all([
    prisma.contactHistory.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.contactHistory.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.deal.count({ where: { deletedAt: null, dealDate: { gte: thisWeekStart } } }),
    prisma.deal.count({ where: { deletedAt: null, dealDate: { gte: lastWeekStart, lte: lastWeekEnd } } }),
    prisma.deal.count({ where: { deletedAt: null, dealDate: { gte: thisMonthStart } } }),
    prisma.deal.count({ where: { deletedAt: null, dealDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.deal.aggregate({ where: { deletedAt: null, dealDate: { gte: thisMonthStart } }, _sum: { nominal: true } }),
    prisma.deal.aggregate({ where: { deletedAt: null, dealDate: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { nominal: true } }),
    prisma.affiliate.count({ where: { deletedAt: null, createdAt: { gte: thisMonthStart } } }),
    prisma.affiliate.count({ where: { deletedAt: null, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.affiliate.count({ where: { deletedAt: null, lastContactDate: { gte: thisMonthStart } } }),
    prisma.affiliate.count({ where: { deletedAt: null, lastContactDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
  ])

  const revThis = revenueThisMonth._sum.nominal || 0
  const revLast = revenueLastMonth._sum.nominal || 0

  const conversionThis = contactedThisMonth > 0 ? (dealsThisMonth / contactedThisMonth) * 100 : 0
  const conversionLast = contactedLastMonth > 0 ? (dealsLastMonth / contactedLastMonth) * 100 : 0

  const comparisons: MetricComparison[] = [
    {
      label: 'Kontak Hari Ini vs Kemarin',
      current: contactsToday,
      previous: contactsYesterday,
      changePct: pctChange(contactsToday, contactsYesterday),
      trend: trend(contactsToday, contactsYesterday),
    },
    {
      label: 'Deal Minggu Ini vs Minggu Lalu',
      current: dealsThisWeek,
      previous: dealsLastWeek,
      changePct: pctChange(dealsThisWeek, dealsLastWeek),
      trend: trend(dealsThisWeek, dealsLastWeek),
    },
    {
      label: 'Deal Bulan Ini vs Bulan Lalu',
      current: dealsThisMonth,
      previous: dealsLastMonth,
      changePct: pctChange(dealsThisMonth, dealsLastMonth),
      trend: trend(dealsThisMonth, dealsLastMonth),
    },
    {
      label: 'Revenue Bulan Ini vs Bulan Lalu',
      current: revThis,
      previous: revLast,
      changePct: pctChange(revThis, revLast),
      trend: trend(revThis, revLast),
      unit: 'Rp',
    },
    {
      label: 'Affiliate Baru Bulan Ini vs Bulan Lalu',
      current: affiliatesThisMonth,
      previous: affiliatesLastMonth,
      changePct: pctChange(affiliatesThisMonth, affiliatesLastMonth),
      trend: trend(affiliatesThisMonth, affiliatesLastMonth),
    },
    {
      label: 'Conversion Rate MoM',
      current: parseFloat(conversionThis.toFixed(1)),
      previous: parseFloat(conversionLast.toFixed(1)),
      changePct: pctChange(conversionThis, conversionLast),
      trend: trend(conversionThis, conversionLast),
      unit: '%',
    },
  ]

  const dealMoM = pctChange(dealsThisMonth, dealsLastMonth)
  const revMoM = pctChange(revThis, revLast)

  let summary = `Analisis bisnis SJ Kitchen: `
  if (dealMoM > 0) summary += `Deal naik ${dealMoM}% MoM. `
  else if (dealMoM < 0) summary += `Deal turun ${Math.abs(dealMoM)}% MoM — perlu evaluasi pipeline. `
  else summary += `Deal stabil MoM. `

  if (revMoM > 0) summary += `Revenue bulan ini Rp ${revThis.toLocaleString('id-ID')} (+${revMoM}%). `
  else if (revMoM < 0) summary += `Revenue turun ${Math.abs(revMoM)}% — fokus closing negotiation. `

  summary += `Conversion rate: ${conversionThis.toFixed(1)}% (${conversionLast.toFixed(1)}% bulan lalu).`

  return { generatedAt: now.toISOString(), comparisons, summary }
}
