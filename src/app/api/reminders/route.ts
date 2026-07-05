import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { syncReminders } from '@/lib/reminders'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 1. Sync reminders
    await syncReminders()

    // 2. Fetch all active/completed reminders
    const { searchParams } = new URL(req.url)
    const completed = searchParams.get('completed') === 'true'

    const reminders = await prisma.reminder.findMany({
      where: { completed },
      include: {
        affiliate: {
          select: { username: true, name: true, status: true, picId: true }
        },
        deal: {
          select: { product: true, nominal: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    // Filter by PIC if needed (staff only sees their own assigned affiliates)
    const filteredReminders = user.role === 'STAFF' || user.role === 'PIC'
      ? reminders.filter(r => r.affiliate?.picId === user.id)
      : reminders

    return NextResponse.json({ success: true, data: filteredReminders })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch reminders', error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, completed } = body

    if (!id) {
      return NextResponse.json({ message: 'Reminder ID is required' }, { status: 400 })
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: { completed }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to update reminder', error: error.message }, { status: 500 })
  }
}
