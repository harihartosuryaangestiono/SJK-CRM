import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { CampaignStatus } from '@prisma/client'

const campaignSchema = z.object({
  name: z.string().min(1),
  status: z.nativeEnum(CampaignStatus).optional(),
  budget: z.number().optional().default(0),
  targetCreator: z.number().optional().default(0),
  targetVideo: z.number().optional().default(0),
  targetLive: z.number().optional().default(0),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})


export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const campaigns = await prisma.campaign.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            affiliates: { where: { deletedAt: null } },
            deals: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: campaigns })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch campaigns', error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = campaignSchema.parse(body)

    const campaign = await prisma.campaign.create({
      data: {
        ...parsed,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      }
    })

    await logAudit({
      req,
      userId: user.id,
      userName: user.name,
      entity: 'Campaign',
      entityId: campaign.id,
      action: 'CREATE',
      newValue: campaign
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Validation failed' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ message: 'Campaign ID is required' }, { status: 400 })

    const updateData: any = { ...updates }
    if (updates.startDate) updateData.startDate = new Date(updates.startDate)
    if (updates.endDate) updateData.endDate = new Date(updates.endDate)
    if (updates.startDate === null) updateData.startDate = null
    if (updates.endDate === null) updateData.endDate = null

    const campaign = await prisma.campaign.update({ where: { id }, data: updateData })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ message: 'Campaign ID required' }, { status: 400 })

    await prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

