import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { calculateHealthScore, getTopHealthScores } from '@/lib/ai/health-score'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const affiliateId = searchParams.get('affiliateId')
    const top = searchParams.get('top')

    if (affiliateId) {
      const health = await calculateHealthScore(affiliateId)
      if (!health) {
        return NextResponse.json({ success: false, message: 'Affiliate not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: health })
    }

    if (top) {
      const limit = parseInt(top, 10) || 5
      const scores = await getTopHealthScores(limit)
      return NextResponse.json({ success: true, data: scores })
    }

    return NextResponse.json({ success: false, message: 'Provide affiliateId or top parameter' }, { status: 400 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to calculate health score', error: msg }, { status: 500 })
  }
}
