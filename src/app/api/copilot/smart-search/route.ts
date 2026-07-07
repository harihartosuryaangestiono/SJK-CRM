import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { executeSmartSearch, parseNaturalLanguageQuery } from '@/lib/ai/smart-search'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''

    if (!query || query.trim().length < 8) {
      return NextResponse.json({ success: true, data: [], isNaturalLanguage: false })
    }

    const parsed = parseNaturalLanguageQuery(query)
    if (!parsed) {
      return NextResponse.json({ success: true, data: [], isNaturalLanguage: false })
    }

    const results = await executeSmartSearch(query)
    return NextResponse.json({
      success: true,
      data: results,
      isNaturalLanguage: true,
      description: parsed.description,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Smart search failed', error: msg }, { status: 500 })
  }
}
