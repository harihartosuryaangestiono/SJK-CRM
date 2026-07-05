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
    const query = searchParams.get('q') || ''

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, data: { affiliates: [], campaigns: [], deals: [], users: [] } })
    }

    const searchStr = query.trim()

    // 1. Search Affiliates
    const affiliates = await prisma.affiliate.findMany({
      where: {
        deletedAt: null,
        OR: [
          { username: { contains: searchStr, mode: 'insensitive' } },
          { name: { contains: searchStr, mode: 'insensitive' } },
          { waContact: { contains: searchStr, mode: 'insensitive' } },
          { niche: { contains: searchStr, mode: 'insensitive' } },
          { remarks: { contains: searchStr, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        status: true
      },
      take: 8
    })

    // 2. Search Campaigns
    const campaigns = await prisma.campaign.findMany({
      where: {
        deletedAt: null,
        name: { contains: searchStr, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        status: true
      },
      take: 5
    })

    // 3. Search Deals
    const deals = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        OR: [
          { product: { contains: searchStr, mode: 'insensitive' } },
          { affiliate: { username: { contains: searchStr, mode: 'insensitive' } } }
        ]
      },
      select: {
        id: true,
        product: true,
        nominal: true,
        affiliate: { select: { username: true } }
      },
      take: 5
    })

    // 4. Search PICs (Users)
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { email: { contains: searchStr, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        role: true
      },
      take: 5
    })

    return NextResponse.json({
      success: true,
      data: {
        affiliates,
        campaigns,
        deals,
        users
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Search failed', error: error.message }, { status: 500 })
  }
}
