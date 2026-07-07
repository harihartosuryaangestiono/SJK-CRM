import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { exportDailySummaryMarkdown, exportConversationMarkdown } from '@/lib/ai/proactive-alerts'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'daily-summary'
    const conversationId = searchParams.get('conversationId')
    const format = searchParams.get('format') || 'markdown'

    if (type === 'conversation') {
      if (!conversationId) {
        return NextResponse.json({ success: false, message: 'conversationId required' }, { status: 400 })
      }
      const md = await exportConversationMarkdown(conversationId, user.id)
      if (!md) {
        return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, content: md, format, filename: `copilot-chat-${conversationId.slice(0, 8)}.md` })
    }

    const md = await exportDailySummaryMarkdown()
    const filename = `sjk-daily-summary-${new Date().toISOString().slice(0, 10)}.md`

    return NextResponse.json({ success: true, content: md, format, filename })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Export failed', error: msg }, { status: 500 })
  }
}
