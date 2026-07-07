import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateBusinessAnalytics } from '@/lib/ai/analyst'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const analytics = await generateBusinessAnalytics()
    return NextResponse.json({ success: true, data: analytics })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to generate analytics', error: msg }, { status: 500 })
  }
}
