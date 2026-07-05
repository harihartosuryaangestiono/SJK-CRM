import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        read: false
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch notifications', error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, all } = body

    if (all) {
      await prisma.notification.updateMany({
        where: { userId: user.id },
        data: { read: true }
      })
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (!id) {
      return NextResponse.json({ message: 'Notification ID is required' }, { status: 400 })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to update notifications', error: error.message }, { status: 500 })
  }
}
