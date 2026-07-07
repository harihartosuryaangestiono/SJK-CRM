import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { buildCRMContext, buildFallbackResponse, formatContextForPrompt } from '@/lib/ai/context'
import { generateCopilotResponse } from '@/lib/ai/gemini'
import { buildChatPrompt } from '@/lib/ai/system-prompt'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const snapshot = await buildCRMContext('Ringkasan performa affiliate bulan ini')
    const crmContext = formatContextForPrompt(snapshot)

    const prompt = buildChatPrompt({
      crmContext,
      pageContext: 'Dashboard — AI Daily Summary',
      history: [],
      userMessage: 'Buat ringkasan eksekutif harian performa affiliate SJ Kitchen bulan ini dalam 3 kalimat, plus 1 rekomendasi tindakan.',
    })

    const { structured, provider } = await generateCopilotResponse(prompt)
    const finalStructured = structured ?? buildFallbackResponse(snapshot)

    return NextResponse.json({
      success: true,
      summary: finalStructured.summary,
      structured: finalStructured,
      provider,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      summary: 'Gagal memuat AI Summary Analitik saat ini.',
      error: msg,
    }, { status: 500 })
  }
}
