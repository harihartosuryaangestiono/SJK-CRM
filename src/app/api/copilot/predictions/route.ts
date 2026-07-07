import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generatePredictions } from '@/lib/ai/predictions'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const predictions = await generatePredictions()
    return NextResponse.json({
      success: true,
      data: predictions,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to generate predictions', error: msg }, { status: 500 })
  }
}
