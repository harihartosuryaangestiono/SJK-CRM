import type { CRMContextSnapshot, CopilotStructuredResponse } from './types'

const STARTER_QUESTIONS = [
  'Apa yang harus saya prioritaskan hari ini?',
  'Siapa yang harus saya follow up hari ini?',
  'Berapa conversion rate affiliate bulan ini?',
  'Berapa SOW yang overdue?',
  'Siapa creator dengan GMV tertinggi?',
]

export function getStarterQuestions(): string[] {
  return STARTER_QUESTIONS
}

export function generateSuggestedFollowUps(
  userMessage: string,
  snapshot: CRMContextSnapshot,
  structured: CopilotStructuredResponse
): string[] {
  const lower = userMessage.toLowerCase()
  const d = snapshot.dashboard as Record<string, number>
  const suggestions: string[] = []

  const add = (q: string) => {
    if (!suggestions.includes(q) && suggestions.length < 4) suggestions.push(q)
  }

  // Context-aware follow-ups based on what user just asked
  if (/priorit|hari ini|today|workflow|tindakan/i.test(lower)) {
    add('Siapa creator dengan GMV tertinggi yang belum dihubungi?')
    add(`Berapa SOW overdue saat ini? (${d.sowOverdue ?? 0} terdeteksi)`)
    add('Creator mana yang perlu re-approach?')
    add('Bagaimana performa campaign aktif bulan ini?')
  }

  if (/follow.?up|hubungi|contact|outreach/i.test(lower)) {
    add('Siapa yang statusnya Negotiation?')
    add('Creator mana yang no response lebih dari 30 hari?')
    add(`Ada berapa follow up jatuh tempo? (${d.needFollowUpToday ?? 0})`)
    add('Buatkan draft pesan follow-up untuk creator prioritas')
  }

  if (/conversion|deal|revenue|perform/i.test(lower)) {
    add('Bandingkan deal bulan ini vs bulan lalu')
    add('Siapa top 5 creator berdasarkan GMV?')
    add('PIC mana yang paling banyak closing deal?')
    add('Berapa repeat creator rate kita?')
  }

  if (/sow|deadline|overdue|video/i.test(lower)) {
    add('Deal mana yang belum upload video sama sekali?')
    add(`Berapa SOW due hari ini? (${d.sowDueToday ?? 0})`)
    add('Creator mana dengan SOW overdue paling lama?')
    add('Siapa yang harus saya ingatkan upload video?')
  }

  if (/gmv|creator|affiliate|top/i.test(lower)) {
    add('Creator top GMV mana yang belum jadi deal?')
    add('Siapa creator curated dengan performa terbaik?')
    add('Ada creator blacklist yang perlu direview?')
    add('Health score creator prioritas tinggi?')
  }

  if (/campaign|kampanye/i.test(lower)) {
    add('Campaign mana yang paling banyak deal?')
    add('Campaign aktif mana yang under target?')
    add('Berapa creator per campaign aktif?')
    add('ROI campaign terbaik bulan ini?')
  }

  if (/blacklist|anomali|duplikat|missing/i.test(lower)) {
    add('Ada duplikat nomor WhatsApp?')
    add('Creator mana yang datanya tidak lengkap?')
    add('Siapa creator inactive lebih dari 30 hari?')
    add('Berapa creator di blacklist?')
  }

  // Fill from structured response nextAction / recommendation themes
  const combined = `${structured.recommendation} ${structured.nextAction} ${structured.insight}`.toLowerCase()
  if (/negotiation|negosiasi/i.test(combined)) {
    add('Siapa saja creator di tahap Negotiation?')
  }
  if (/sow|overdue|deadline/i.test(combined)) {
    add('Tampilkan semua SOW overdue')
  }
  if (/follow.?up|hubungi/i.test(combined)) {
    add('Siapa yang harus di-follow up selanjutnya?')
  }
  if (/gmv|top|perform/i.test(combined)) {
    add('Analisis top performer bulan ini')
  }

  // Generic fallbacks if still empty or need more
  if (suggestions.length < 3) {
    add('Apa risiko terbesar di pipeline hari ini?')
    add('Siapa creator yang paling likely close deal?')
    add('Ringkasan performa outreach minggu ini')
    add('Prediksi deal bulan depan bagaimana?')
  }

  // Don't repeat the question user just asked
  return suggestions
    .filter(q => q.toLowerCase() !== lower)
    .slice(0, 4)
}
