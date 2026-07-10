import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateCopilotResponse } from '@/lib/ai/gemini'
import { buildChatPrompt } from '@/lib/ai/system-prompt'

function buildExecutiveFallbackResponse(s: any, range: string) {
  const rangeLabel = range.replace('_', ' ')
  const totalContacted = s.totalContacted?.total || 0
  const joined = s.joined?.total || 0
  const revenue = s.revenue?.total || 0
  const joinRate = s.joinRate?.total || 0
  const activeSow = s.activeSow?.total || 0
  const completedSow = s.completedSow?.total || 0
  const commission = s.commission?.total || 0

  return {
    summary: `Analisis performa CRM periode ${rangeLabel} mencatatkan total ${totalContacted} affiliate dihubungi dengan ${joined} creator bergabung ke jaringan.`,
    analysis: `Dari outreach tersebut, diperoleh join rate sebesar ${joinRate.toFixed(1)}%. Revenue kontrak SOW yang terbentuk bernilai Rp ${revenue.toLocaleString('id-ID')} dengan insentif komisi PIC teralokasi sebesar Rp ${commission.toLocaleString('id-ID')}.`,
    insight: `Saat ini terdapat ${activeSow} pengerjaan SOW yang sedang berlangsung (In Progress) dan ${completedSow} SOW telah diselesaikan. Konversi deal rate tercatat sebesar ${(s.dealRate?.total || 0).toFixed(1)}%.`,
    recommendation: `Optimalkan interaksi dengan ${s.noResponse?.total || 0} prospek yang belum merespons, serta dorong penyelesaian ${s.activeSow?.total || 0} SOW aktif agar segera menjadi revenue terealisasi.`,
    nextAction: `Review daftar reminder follow-up yang tertunda untuk meningkatkan respon, dan pantau status pengiriman sampel pada SOW yang berjalan.`
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const range = searchParams.get('range') || 'this_month'
    const picId = searchParams.get('picId') || ''

    // Fetch the summary metrics from our local API internally
    const origin = req.nextUrl.origin
    const url = new URL('/api/executive-summary', origin)
    url.searchParams.set('range', range)
    if (searchParams.get('startDate')) url.searchParams.set('startDate', searchParams.get('startDate')!)
    if (searchParams.get('endDate')) url.searchParams.set('endDate', searchParams.get('endDate')!)
    if (picId) url.searchParams.set('picId', picId)

    const statsRes = await fetch(url.toString(), {
      headers: {
        // Pass session headers if any (since this is internal fetch)
        Cookie: req.headers.get('cookie') || '',
      },
    })

    if (!statsRes.ok) {
      throw new Error('Failed to fetch stats for AI context')
    }

    const statsJson = await statsRes.json()
    if (!statsJson.success) {
      throw new Error(statsJson.message || 'Stats query failed')
    }

    const s = statsJson.stats
    const crmContext = `
=== Executive Summary Context ===
Periode: ${range.toUpperCase()}
Total Contacted: ${s.totalContacted?.total || 0} (Arah: ${s.totalContacted?.change || 0}%)
Contact via WA: ${s.waContacts?.total || 0} (Arah: ${s.waContacts?.change || 0}%)
Contact via TikTok: ${s.tiktokContacts?.total || 0} (Arah: ${s.tiktokContacts?.change || 0}%)
Contact via Instagram: ${s.instagramContacts?.total || 0} (Arah: ${s.instagramContacts?.change || 0}%)
Joined: ${s.joined?.total || 0} (Arah: ${s.joined?.change || 0}%)
Deals Signed: ${s.totalDeals?.total || 0} (Arah: ${s.totalDeals?.change || 0}%)
SOW In Progress: ${s.activeSow?.total || 0}
SOW Completed: ${s.completedSow?.total || 0}
Blacklisted: ${s.blacklisted?.total || 0}
Videos Uploaded: ${s.videoUploaded?.total || 0}
Revenue: Rp ${(s.revenue?.total || 0).toLocaleString('id-ID')} (Arah: ${s.revenue?.change || 0}%)
Commission: Rp ${(s.commission?.total || 0).toLocaleString('id-ID')}
Join Rate: ${s.joinRate?.total || 0}%
Deal Rate: ${s.dealRate?.total || 0}%
Response Rate: ${s.responseRate?.total || 0}%
Completion Rate: ${s.completionRate?.total || 0}%
    `

    const prompt = buildChatPrompt({
      crmContext,
      pageContext: 'Executive Summary — Analytics Insights & Performance Dashboard',
      history: [],
      userMessage: `Buat ringkasan eksekutif analitik tentang performa CRM periode ${range} saat ini dalam 4-5 poin utama (Bahasa Indonesia). Cantumkan performa secara keseluruhan, pergerakan rate (join rate / response rate), status pengerjaan video SOW, dan berikan 2 rekomendasi tindakan strategis terbaik hari ini berdasarkan data tersebut.`,
    })

    let structured = null
    let providerName = 'fallback'

    try {
      const res = await generateCopilotResponse(prompt)
      structured = res.structured
      providerName = res.provider
    } catch (e) {
      console.warn('Gemini generate failed, switching to local analytical fallback:', e)
    }

    const finalStructured = structured || buildExecutiveFallbackResponse(s, range)
    
    return NextResponse.json({
      success: true,
      summary: finalStructured.summary,
      analysis: finalStructured.analysis || '',
      insight: finalStructured.insight || '',
      recommendation: finalStructured.recommendation || '',
      nextAction: finalStructured.nextAction || '',
      provider: providerName,
    })
  } catch (error: any) {
    console.error('Executive Summary AI error:', error)
    return NextResponse.json({
      success: false,
      summary: 'Gagal memuat AI Summary Analitik saat ini.',
      error: error.message,
    }, { status: 500 })
  }
}
