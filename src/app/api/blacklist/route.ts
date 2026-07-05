import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const blacklist = await prisma.affiliate.findMany({
      where: {
        status: 'Blacklist',
        deletedAt: null
      },
      include: {
        campaign: { select: { name: true } },
        pic: { select: { name: true } }
      },
      orderBy: { blacklistDate: 'desc' }
    })

    return NextResponse.json({ success: true, data: blacklist })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch blacklist creators', error: error.message }, { status: 500 })
  }
}
