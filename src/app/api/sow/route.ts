import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// GET /api/sow — fetch all deals grouped for SOW tracking page
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const picId = searchParams.get('picId')

    const where: any = { deletedAt: null }
    if (campaignId && campaignId !== 'all') where.campaignId = campaignId
    if (picId && picId !== 'all') where.picId = picId

    const deals = await prisma.deal.findMany({
      where,
      include: {
        affiliate: {
          select: {
            id: true,
            username: true,
            name: true,
            followers: true,
            followersCount: true,
            gmv: true,
            gmvCount: true,
            waContact: true,
            status: true
          }
        },
        campaign: { select: { id: true, name: true } },
        pic: { select: { id: true, name: true } }
      },
      orderBy: { dealDate: 'desc' }
    })

    // Compute video links array for each deal
    const enriched = deals.map(deal => {
      const links = [
        deal.videoLink1,
        deal.videoLink2,
        deal.videoLink3,
        (deal as any).videoLink4,
        (deal as any).videoLink5,
      ].filter(Boolean) as string[]

      const targetVideo = deal.targetVideo || 1
      const uploaded = deal.uploadedVideoCount || 0

      // Determine H+ days since sample received or sent
      const now = new Date()
      let daysSinceReceived: number | null = null
      let daysSinceSent: number | null = null
      if (deal.sampleReceivedDate) {
        daysSinceReceived = Math.floor((now.getTime() - new Date(deal.sampleReceivedDate).getTime()) / (1000 * 60 * 60 * 24))
      }
      if (deal.sampleSentDate) {
        daysSinceSent = Math.floor((now.getTime() - new Date(deal.sampleSentDate).getTime()) / (1000 * 60 * 60 * 24))
      }

      // Classify the deal into SOW buckets
      let bucket: 'sample_sent' | 'sow_active' | 'sow_completed' | 'not_started'
      if (uploaded >= targetVideo && links.length >= targetVideo) {
        bucket = 'sow_completed'
      } else if (deal.sampleReceivedDate) {
        bucket = 'sow_active'
      } else if (deal.sampleSentDate) {
        bucket = 'sample_sent'
      } else {
        bucket = 'not_started'
      }

      // Determine overdue status (>14 days after received without completion)
      const isOverdue = bucket === 'sow_active' && daysSinceReceived !== null && daysSinceReceived > 14

      // Compute deadline
      let deadline: string | null = null
      if (deal.deadline) {
        deadline = new Date(deal.deadline).toISOString().split('T')[0]
      } else if (deal.sampleReceivedDate) {
        const dl = new Date(deal.sampleReceivedDate)
        dl.setDate(dl.getDate() + 14)
        deadline = dl.toISOString().split('T')[0]
      }

      return {
        ...deal,
        videoLinks: links,
        videoLink4: (deal as any).videoLink4 ?? null,
        videoLink5: (deal as any).videoLink5 ?? null,
        daysSinceReceived,
        daysSinceSent,
        bucket,
        isOverdue,
        deadline,
        progressPercent: Math.min(100, Math.round((uploaded / targetVideo) * 100))
      }
    })

    // Group into buckets
    const result = {
      sampleSent: enriched.filter(d => d.bucket === 'sample_sent'),
      sowActive: enriched.filter(d => d.bucket === 'sow_active'),
      sowCompleted: enriched.filter(d => d.bucket === 'sow_completed'),
      notStarted: enriched.filter(d => d.bucket === 'not_started'),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('SOW API error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch SOW data', error: error.message }, { status: 500 })
  }
}
