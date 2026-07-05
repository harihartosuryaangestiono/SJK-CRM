import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all active affiliates (without pagination for Kanban mapping)
    const affiliates = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        username: true,
        name: true,
        status: true,
        priority: true,
        followers: true,
        gmv: true,
        niche: true,
        pic: {
          select: { name: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: affiliates })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch kanban data', error: error.message }, { status: 500 })
  }
}
