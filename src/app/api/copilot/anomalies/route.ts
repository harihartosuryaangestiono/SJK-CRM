import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { detectAnomalies } from '@/lib/ai/anomaly'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const anomalies = await detectAnomalies()
    return NextResponse.json({
      success: true,
      data: anomalies,
      count: anomalies.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to detect anomalies', error: msg }, { status: 500 })
  }
}
