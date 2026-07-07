import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateProactiveAlerts } from '@/lib/ai/proactive-alerts'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const alerts = await generateProactiveAlerts()
    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to generate alerts', error: msg }, { status: 500 })
  }
}
