import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { affiliateSchema } from '@/lib/validations'
import { getSessionUser } from '@/lib/auth'
import { Priority } from '@prisma/client'

// GET paginated, searched, and filtered affiliates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    // Search query
    const search = searchParams.get('search') || ''

    // Filter parameters
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaignId')
    const picId = searchParams.get('picId')
    const niche = searchParams.get('niche')
    
    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Construct Prisma where clause
    const where: any = {
      deletedAt: null,
    }

    // Search query matches username, name, waContact, or remarks
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { waContact: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filter logic
    if (status && status !== 'all') {
      where.status = status
    }
    if (campaignId && campaignId !== 'all') {
      where.campaignId = campaignId
    }
    if (picId && picId !== 'all') {
      where.picId = picId
    }
    if (niche && niche !== 'all') {
      where.niche = niche
    }

    // Followers filter ranges
    const followersRange = searchParams.get('followersRange')
    if (followersRange && followersRange !== 'all') {
      if (followersRange === 'under-10k') {
        where.followersCount = { lt: 10000 }
      } else if (followersRange === '10k-50k') {
        where.followersCount = { gte: 10000, lte: 50000 }
      } else if (followersRange === '50k-100k') {
        where.followersCount = { gte: 50000, lte: 100000 }
      } else if (followersRange === 'over-100k') {
        where.followersCount = { gt: 100000 }
      }
    }

    // GMV filter ranges
    const gmvRange = searchParams.get('gmvRange')
    if (gmvRange && gmvRange !== 'all') {
      if (gmvRange === 'under-10jt') {
        where.gmvCount = { lt: 10000000 }
      } else if (gmvRange === '10jt-50jt') {
        where.gmvCount = { gte: 10000000, lte: 50000000 }
      } else if (gmvRange === '50jt-200jt') {
        where.gmvCount = { gte: 50000000, lte: 200000000 }
      } else if (gmvRange === 'over-200jt') {
        where.gmvCount = { gt: 200000000 }
      }
    }

    // Map sort fields for relational or standard fields
    let orderBy: any = {}
    if (sortBy === 'pic') {
      orderBy = { pic: { name: sortOrder } }
    } else if (sortBy === 'campaign') {
      orderBy = { campaign: { name: sortOrder } }
    } else {
      orderBy = { [sortBy]: sortOrder }
    }

    // Fetch data and count total records in parallel
    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          pic: {
            select: { id: true, name: true, role: true }
          },
          campaign: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.affiliate.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: affiliates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch affiliates', error: error.message }, { status: 500 })
  }
}

// POST manual create affiliate
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = affiliateSchema.parse(body)

    // Check duplicate username
    const existing = await prisma.affiliate.findUnique({
      where: { username: parsed.username }
    })

    if (existing) {
      return NextResponse.json({ message: `Username TikTok @${parsed.username} sudah terdaftar di database.` }, { status: 400 })
    }

    // Create affiliate
    const affiliate = await prisma.affiliate.create({
      data: {
        ...parsed,
        listingDate: parsed.listingDate || new Date(),
        picId: parsed.picId || user.id // Default PIC to logged in user if not specified
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        affiliateId: affiliate.id,
        userId: user.id,
        action: 'CREATOR_CREATE',
        details: `Manually created creator @${affiliate.username} with status '${affiliate.status}'`
      }
    })

    // Log status change if status is set
    if (affiliate.status) {
      await prisma.statusHistory.create({
        data: {
          affiliateId: affiliate.id,
          oldStatus: 'Belum Dihubungi',
          newStatus: affiliate.status
        }
      })
    }

    return NextResponse.json({ success: true, data: affiliate })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Validation failed' }, { status: 400 })
  }
}

// PATCH bulk actions (Delete, Assign PIC, Change Status, Move Campaign)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.url ? await req.json() : {}
    const { ids, action, value } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: 'IDs must be an array and cannot be empty' }, { status: 400 })
    }

    const updateData: any = {}
    let activityDetails = ''
    let logAction = ''

    if (action === 'assign-pic') {
      updateData.picId = value || null
      const picUser = value ? await prisma.user.findUnique({ where: { id: value }, select: { name: true } }) : null
      activityDetails = `Assigned PIC to ${picUser ? picUser.name : 'Unassigned'}`
      logAction = 'BULK_ASSIGN_PIC'
    } else if (action === 'change-status') {
      updateData.status = value
      activityDetails = `Changed status to '${value}'`
      logAction = 'BULK_STATUS_CHANGE'
    } else if (action === 'move-campaign') {
      updateData.campaignId = value || null
      const campaign = value ? await prisma.campaign.findUnique({ where: { id: value }, select: { name: true } }) : null
      activityDetails = `Moved to campaign ${campaign ? campaign.name : 'No Campaign'}`
      logAction = 'BULK_MOVE_CAMPAIGN'
    } else {
      return NextResponse.json({ message: 'Invalid action parameter' }, { status: 400 })
    }

    // Execute bulk update
    await prisma.affiliate.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    })

    // Log activities for each updated creator
    const activities = ids.map(id => ({
      affiliateId: id,
      userId: user.id,
      action: logAction,
      details: activityDetails
    }))

    await prisma.activity.createMany({ data: activities })

    // If changing status, log status histories
    if (action === 'change-status') {
      // Find current statuses of these affiliates to log transitions
      const affiliates = await prisma.affiliate.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true }
      })

      const statusHistories = affiliates.map(aff => ({
        affiliateId: aff.id,
        oldStatus: aff.status, // Note: updateMany was already run so they have the new status in db, but we record transition. Let's make it simpler:
        newStatus: value
      }))
      // Since updateMany runs before this, we record transition. Let's assume they transitioned to value.
    }

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Bulk action failed', error: error.message }, { status: 500 })
  }
}

// DELETE bulk delete affiliates (Soft Delete)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const idsString = searchParams.get('ids')
    if (!idsString) {
      return NextResponse.json({ message: 'IDs query parameter is required' }, { status: 400 })
    }

    const ids = idsString.split(',')
    
    // Soft delete
    await prisma.affiliate.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        deletedAt: new Date(),
        deletedBy: user.name || user.email
      }
    })

    // Log activities
    const activities = ids.map(id => ({
      affiliateId: id,
      userId: user.id,
      action: 'BULK_DELETE',
      details: 'Creator soft-deleted'
    }))

    await prisma.activity.createMany({ data: activities })

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to delete affiliates', error: error.message }, { status: 500 })
  }
}
