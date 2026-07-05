import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const picId = searchParams.get('picId')
    const month = searchParams.get('month') // e.g. "2026-07"
    const username = searchParams.get('username')

    // Find all affiliates who have uploaded videos in their deals
    const whereClause: any = {
      deletedAt: null,
      deals: {
        some: {
          deletedAt: null
        }
      }
    }

    if (picId && picId !== 'all') {
      whereClause.picId = picId
    }

    if (username) {
      whereClause.username = { contains: username, mode: 'insensitive' }
    }

    const affiliates = await prisma.affiliate.findMany({
      where: whereClause,
      include: {
        pic: { select: { name: true } },
        campaign: { select: { name: true } },
        deals: {
          where: {
            deletedAt: null,
            ...(campaignId && campaignId !== 'all' ? { campaignId } : {})
          },
          include: {
            campaign: { select: { name: true } }
          }
        }
      }
    })

    const performanceData = affiliates.map(aff => {
      // Filter deals by month if filter is active
      let targetDeals = aff.deals
      if (month && month !== 'all') {
        const [yearStr, monthStr] = month.split('-')
        const y = parseInt(yearStr, 10)
        const m = parseInt(monthStr, 10) - 1
        targetDeals = targetDeals.filter(d => {
          const date = new Date(d.dealDate)
          return date.getFullYear() === y && date.getMonth() === m
        })
      }

      if (targetDeals.length === 0) return null

      const totalGMV = targetDeals.reduce((sum, d) => sum + d.nominal, 0) || aff.gmvCount || 0
      const totalVideo = targetDeals.reduce((sum, d) => sum + d.uploadedVideoCount, 0)
      const targetVideoTotal = targetDeals.reduce((sum, d) => sum + d.targetVideo, 0) || 1
      
      const totalCampaigns = new Set(targetDeals.map(d => d.campaignId)).size
      // totalOrder is not tracked — we don't have order data linked to deals yet
      const totalOrder = 0
      
      const averageGMV = totalVideo > 0 ? Math.round(totalGMV / totalVideo) : totalGMV
      
      // averageViews is not tracked in the database — TikTok views aren't synced
      const averageViews = 0

      const successRate = Math.min(100, Math.round((totalVideo / targetVideoTotal) * 100))

      return {
        id: aff.id,
        name: aff.name || aff.username,
        username: aff.username,
        picName: aff.pic?.name || 'Unassigned',
        campaignName: aff.campaign?.name || 'None',
        totalVideo,
        totalGMV,
        totalOrder,
        totalCampaign: totalCampaigns,
        averageGMV,
        averageViews,
        successRate
      }
    }).filter(Boolean) as any[]

    // Sort by GMV highest to lowest
    performanceData.sort((a, b) => b.totalGMV - a.totalGMV)

    return NextResponse.json({ success: true, data: performanceData })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch performance statistics', error: error.message }, { status: 500 })
  }
}
