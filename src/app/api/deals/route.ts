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

    const where: any = { deletedAt: null }
    if (campaignId && campaignId !== 'all') {
      where.campaignId = campaignId
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        affiliate: {
          select: { username: true, name: true, followers: true, gmv: true, status: true }
        },
        campaign: {
          select: { name: true }
        },
        pic: {
          select: { name: true }
        }
      },
      orderBy: { dealDate: 'desc' }
    })

    return NextResponse.json({ success: true, data: deals })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch deals', error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      id, 
      progressCampaign, 
      completionRate, 
      statusCampaign,
      nominal,
      deadline,
      sampleSentDate,
      sampleReceivedDate,
      videoLink1,
      videoLink2,
      videoLink3,
      videoLink4,
      videoLink5,
      uploadedVideoCount,
      targetVideo: targetVideoUpdate,
      sowStatus
    } = body

    if (!id) {
      return NextResponse.json({ message: 'Deal ID is required' }, { status: 400 })
    }

    const currentDeal = await prisma.deal.findUnique({
      where: { id },
      include: { affiliate: true }
    })

    if (!currentDeal) {
      return NextResponse.json({ message: 'Deal not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (progressCampaign !== undefined) updateData.progressCampaign = progressCampaign
    if (completionRate !== undefined) updateData.completionRate = parseFloat(completionRate)
    if (statusCampaign !== undefined) updateData.statusCampaign = statusCampaign
    if (nominal !== undefined) updateData.nominal = parseInt(nominal, 10) || 0
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
    
    // New SOW fields
    if (sampleSentDate !== undefined) updateData.sampleSentDate = sampleSentDate ? new Date(sampleSentDate) : null
    if (sampleReceivedDate !== undefined) updateData.sampleReceivedDate = sampleReceivedDate ? new Date(sampleReceivedDate) : null
    if (videoLink1 !== undefined) updateData.videoLink1 = videoLink1 || null
    if (videoLink2 !== undefined) updateData.videoLink2 = videoLink2 || null
    if (videoLink3 !== undefined) updateData.videoLink3 = videoLink3 || null
    if (videoLink4 !== undefined) updateData.videoLink4 = videoLink4 || null
    if (videoLink5 !== undefined) updateData.videoLink5 = videoLink5 || null
    if (uploadedVideoCount !== undefined) updateData.uploadedVideoCount = parseInt(uploadedVideoCount, 10) || 0
    if (sowStatus !== undefined) updateData.sowStatus = sowStatus
    if (targetVideoUpdate !== undefined) updateData.targetVideo = parseInt(targetVideoUpdate, 10) || 1

    // Automatically calculate SOW status / completionRate based on targetVideo
    const targetVideo = updateData.targetVideo !== undefined ? updateData.targetVideo : (currentDeal.targetVideo || 1)
    const finalUploaded = updateData.uploadedVideoCount !== undefined ? updateData.uploadedVideoCount : currentDeal.uploadedVideoCount
    const finalRate = Math.min(100, Math.round((finalUploaded / targetVideo) * 100))
    updateData.completionRate = finalRate

    if (finalUploaded >= targetVideo) {
      updateData.sowStatus = 'Completed'
      updateData.progressCampaign = 'COMPLETED'
    } else {
      // If past 14 days and not completed
      const finalReceived = updateData.sampleReceivedDate !== undefined ? updateData.sampleReceivedDate : currentDeal.sampleReceivedDate
      if (finalReceived) {
        const days = Math.floor((new Date().getTime() - new Date(finalReceived).getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 14) {
          updateData.sowStatus = 'Overdue'
        } else {
          updateData.sowStatus = 'In Progress'
        }
      } else {
        updateData.sowStatus = 'In Progress'
      }
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        affiliate: { select: { username: true } }
      }
    })

    // Auto update progress status on status change
    let statusLabel = statusCampaign || currentDeal.statusCampaign
    if (updateData.sowStatus === 'Completed') {
      statusLabel = 'SOW Completed'
    }

    // Log activity
    await prisma.activity.create({
      data: {
        affiliateId: updated.affiliateId,
        userId: user.id,
        action: 'DEAL_PROGRESS_UPDATE',
        details: `Updated deal SOW: ${updateData.sowStatus} (Uploaded: ${finalUploaded}/${targetVideo}, Progress: ${finalRate}%)`
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to update deal', error: error.message }, { status: 500 })
  }
}
