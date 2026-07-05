import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 1. Top Creators by GMV
    const topCreatorsRaw = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      take: 5,
      orderBy: { gmvCount: 'desc' },
      select: {
        username: true,
        followers: true,
        gmv: true,
        status: true
      }
    })

    const topCreators = topCreatorsRaw.map(tc => ({
      username: tc.username,
      followers: tc.followers || '0',
      gmv: tc.gmv || 'Rp 0',
      status: tc.status
    }))

    // 2. PIC Performance
    const usersRaw = await prisma.user.findMany({
      select: {
        name: true,
        role: true,
        _count: {
          select: {
            deals: { where: { deletedAt: null } },
            affiliates: { where: { deletedAt: null } }
          }
        }
      }
    })

    const pics = usersRaw.map(u => ({
      name: u.name,
      role: u.role,
      contacted: u._count.affiliates,
      deals: u._count.deals
    })).filter(p => p.contacted > 0 || p.deals > 0)

    // 3. Campaigns ROI & Conversion Summary
    const campaignsRaw = await prisma.campaign.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            affiliates: { where: { deletedAt: null } }
          }
        },
        deals: {
          where: { deletedAt: null },
          select: { nominal: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const campaigns = campaignsRaw.map(c => {
      const totalNominal = c.deals.reduce((sum, d) => sum + d.nominal, 0)
      const roi = c.budget > 0 ? Math.round((totalNominal / c.budget) * 100) : 0

      return {
        name: c.name,
        budget: c.budget,
        creators: c._count.affiliates,
        roi
      }
    })

    return NextResponse.json({
      success: true,
      topCreators,
      pics,
      campaigns
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch reports data',
      error: error.message
    }, { status: 500 })
  }
}
