import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateInsights } from '@/lib/ai/insights'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const insights = await generateInsights()
    return NextResponse.json({ success: true, data: insights, generatedAt: new Date().toISOString() })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to generate insights', error: msg }, { status: 500 })
  }
}
