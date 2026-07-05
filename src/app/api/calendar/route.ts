import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

/**
 * GET /api/calendar?year=2026&month=6
 *
 * Returns all calendar events for the given month from real database sources:
 * - Reminders (follow-up, SOW deadlines)
 * - Deal deadlines (SOW due dates)
 * - Campaign launch/end dates
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()), 10) // 0-indexed

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)

    // 1. Reminders due this month
    const reminders = await prisma.reminder.findMany({
      where: {
        dueDate: { gte: monthStart, lte: monthEnd },
        completed: false,
        ...(user.role === 'STAFF' || user.role === 'PIC'
          ? { affiliate: { picId: user.id } }
          : {}),
      },
      include: {
        affiliate: { select: { username: true, name: true } },
        deal: { select: { product: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    // 2. Deal deadlines this month (SOW due)
    const dealDeadlines = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        deadline: { gte: monthStart, lte: monthEnd },
        sowStatus: { not: 'Completed' },
      },
      include: {
        affiliate: { select: { username: true, name: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
    })

    // 3. Campaign start/end dates this month
    const campaigns = await prisma.campaign.findMany({
      where: {
        deletedAt: null,
        OR: [
          { startDate: { gte: monthStart, lte: monthEnd } },
          { endDate: { gte: monthStart, lte: monthEnd } },
        ],
      },
      orderBy: { startDate: 'asc' },
    })

    // 4. Deal dates (when deals were created this month)
    const newDeals = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        dealDate: { gte: monthStart, lte: monthEnd },
      },
      include: {
        affiliate: { select: { username: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { dealDate: 'asc' },
    })

    // ─── Map to unified CalendarEvent shape ──────────────────────────────────
    const events: any[] = []

    for (const r of reminders) {
      const typeMap: Record<string, string> = {
        FOLLOW_UP: 'follow-up',
        FOLLOW_UP_1: 'follow-up',
        FOLLOW_UP_2: 'follow-up',
        RE_APPROACH: 'follow-up',
        DEADLINE: 'video-deadline',
        SOW_LAST_WARNING: 'video-deadline',
        SOW_OVERDUE: 'video-deadline',
      }
      events.push({
        id: `reminder-${r.id}`,
        title: `${r.type.replace(/_/g, ' ')}: @${r.affiliate?.username || 'N/A'}`,
        type: typeMap[r.type] || 'follow-up',
        date: r.dueDate.toISOString(),
        details: `Reminder untuk @${r.affiliate?.username}. ${r.deal ? `Produk: ${r.deal.product}` : ''}`,
        creator: r.affiliate?.username || '',
        source: 'reminder',
        reminderId: r.id,
      })
    }

    for (const d of dealDeadlines) {
      events.push({
        id: `deadline-${d.id}`,
        title: `SOW Deadline: @${d.affiliate.username}`,
        type: 'video-deadline',
        date: d.deadline!.toISOString(),
        details: `SOW deadline untuk @${d.affiliate.username} — Campaign: ${d.campaign?.name || 'N/A'}. Status: ${d.sowStatus}`,
        creator: d.affiliate.username,
        source: 'deal',
        dealId: d.id,
      })
    }

    for (const c of campaigns) {
      if (c.startDate && c.startDate >= monthStart && c.startDate <= monthEnd) {
        events.push({
          id: `campaign-start-${c.id}`,
          title: `Launch: ${c.name}`,
          type: 'campaign-launch',
          date: c.startDate.toISOString(),
          details: `Campaign "${c.name}" mulai. Budget: Rp ${c.budget.toLocaleString('id-ID')}`,
          creator: '',
          source: 'campaign',
          campaignId: c.id,
        })
      }
      if (c.endDate && c.endDate >= monthStart && c.endDate <= monthEnd) {
        events.push({
          id: `campaign-end-${c.id}`,
          title: `End: ${c.name}`,
          type: 'campaign-launch',
          date: c.endDate.toISOString(),
          details: `Campaign "${c.name}" berakhir.`,
          creator: '',
          source: 'campaign',
          campaignId: c.id,
        })
      }
    }

    for (const d of newDeals) {
      events.push({
        id: `deal-${d.id}`,
        title: `Deal Closed: @${d.affiliate.username}`,
        type: 'live-schedule',
        date: d.dealDate.toISOString(),
        details: `Deal dengan @${d.affiliate.username} — Campaign: ${d.campaign?.name || 'N/A'}`,
        creator: d.affiliate.username,
        source: 'deal',
        dealId: d.id,
      })
    }

    // Sort all events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({ success: true, data: events })
  } catch (error: any) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch calendar events', error: error.message }, { status: 500 })
  }
}
