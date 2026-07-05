import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  try {
    // 1. Gather stats from database
    const totalAffiliates = await prisma.affiliate.count({ where: { deletedAt: null } })
    const deals = await prisma.affiliate.count({
      where: {
        status: { in: ['Deal', 'Campaign Berjalan', 'Campaign Selesai', 'Repeat Affiliate'] },
        deletedAt: null
      }
    })
    const contacted = await prisma.affiliate.count({
      where: {
        status: { not: 'Belum Dihubungi' },
        deletedAt: null
      }
    })
    
    // Top creator info
    const topCreator = await prisma.affiliate.findFirst({
      where: { deletedAt: null },
      orderBy: { gmvCount: 'desc' },
      select: { username: true, gmv: true }
    })

    const conversionRate = contacted > 0 ? ((deals / contacted) * 100).toFixed(1) : '0'
    const topCreatorName = topCreator ? `@${topCreator.username}` : 'none'
    const topCreatorGmv = topCreator ? topCreator.gmv : 'Rp 0'

    const metricsText = `
      SJ Kitchen CRM Monthly Stats:
      - Total Affiliates: ${totalAffiliates}
      - Contacted Affiliates: ${contacted}
      - Closed Deals: ${deals}
      - Conversion Rate (Deals / Contacted): ${conversionRate}%
      - Top Performing Creator: ${topCreatorName} (Generated GMV: ${topCreatorGmv})
    `

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // High fidelity local fallback summary if API Key is not set yet
      const fallbackAnalysis = `Performa affiliate SJ Kitchen bulan ini menunjukkan tingkat konversi yang solid sebesar **${conversionRate}%** dari total **${contacted}** creator yang telah dihubungi. Creator **${topCreatorName}** memimpin perolehan kontribusi dengan estimasi GMV mencapai **${topCreatorGmv}**. Fokus utama tim adalah mempercepat tindak lanjut pada antrean negosiasi untuk memaksimalkan ROI campaign berjalan.`
      
      return NextResponse.json({
        success: true,
        summary: fallbackAnalysis,
        provider: 'fallback'
      })
    }

    // Call real Gemini API
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
      Anda adalah Asisten Analitik AI Enterprise untuk brand makanan premium SJ Kitchen.
      Berdasarkan metrik performa affiliate berikut, berikan ringkasan eksekutif 3 kalimat yang profesional, padat, dan analitis mengenai performa bulan ini serta rekomendasi singkat tindakan selanjutnya. Jawab dalam Bahasa Indonesia yang formal.

      Metrik Data:
      ${metricsText}
    `

    const result = await model.generateContent(prompt)
    const summaryText = result.response.text().trim()

    return NextResponse.json({
      success: true,
      summary: summaryText,
      provider: 'gemini'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      summary: 'Gagal memuat AI Summary Analitik saat ini.',
      error: error.message
    }, { status: 500 })
  }
}
