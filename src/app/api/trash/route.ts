import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// GET all soft-deleted records
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch soft-deleted affiliates
    const affiliates = await prisma.affiliate.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        username: true,
        name: true,
        status: true,
        deletedAt: true,
        deletedBy: true
      },
      orderBy: { deletedAt: 'desc' }
    })

    // Fetch soft-deleted campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        status: true,
        deletedAt: true,
        deletedBy: true
      },
      orderBy: { deletedAt: 'desc' }
    })

    // Fetch soft-deleted deals
    const deals = await prisma.deal.findMany({
      where: { deletedAt: { not: null } },
      include: {
        affiliate: { select: { username: true } },
        campaign: { select: { name: true } }
      },
      orderBy: { deletedAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        affiliates,
        campaigns,
        deals
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch trash records', error: error.message }, { status: 500 })
  }
}

// POST: Restore a soft-deleted record
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, id } = body // type: 'affiliate' | 'campaign' | 'deal'

    if (!type || !id) {
      return NextResponse.json({ message: 'Type and ID are required' }, { status: 400 })
    }

    let restoredRecord: any = null

    if (type === 'affiliate') {
      restoredRecord = await prisma.affiliate.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null }
      })

      // Log activity
      await prisma.activity.create({
        data: {
          affiliateId: id,
          userId: user.id,
          action: 'RESTORE',
          details: `Restored affiliate profile @${restoredRecord.username}`
        }
      })

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          entity: 'Affiliate',
          entityId: id,
          action: 'RESTORE',
          newValue: JSON.stringify({ username: restoredRecord.username, status: restoredRecord.status }),
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          browser: req.headers.get('user-agent')
        }
      })
    } else if (type === 'campaign') {
      restoredRecord = await prisma.campaign.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null }
      })

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          entity: 'Campaign',
          entityId: id,
          action: 'RESTORE',
          newValue: JSON.stringify({ name: restoredRecord.name, status: restoredRecord.status }),
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          browser: req.headers.get('user-agent')
        }
      })
    } else if (type === 'deal') {
      restoredRecord = await prisma.deal.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null }
      })

      // Log activity
      await prisma.activity.create({
        data: {
          affiliateId: restoredRecord.affiliateId,
          userId: user.id,
          action: 'DEAL_RESTORE',
          details: `Restored deal for SOW Campaign`
        }
      })

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          entity: 'Deal',
          entityId: id,
          action: 'RESTORE',
          newValue: JSON.stringify({ nominal: restoredRecord.nominal, product: restoredRecord.product }),
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          browser: req.headers.get('user-agent')
        }
      })
    } else {
      return NextResponse.json({ message: 'Invalid entity type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Record restored successfully', data: restoredRecord })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to restore record', error: error.message }, { status: 500 })
  }
}
