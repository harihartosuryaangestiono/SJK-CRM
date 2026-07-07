import prisma from '@/lib/prisma'
import { getGeminiModel } from './gemini'

const CONTENT_STUDIO_PROMPT = `You are SJ Kitchen AI Content Studio. Generate outreach messages for affiliate/creator partnerships.

RULES:
- Write in Bahasa Indonesia, friendly-professional tone suitable for food brand SJ Kitchen (premium food products)
- Personalize using ONLY the creator data provided
- Keep WhatsApp messages under 500 characters when channel is WhatsApp
- Keep TikTok DM messages concise and casual
- Do NOT invent facts about the creator
- Return ONLY the message text, no quotes, no markdown, no explanation

Creator Data:
`

export type DraftMessageInput = {
  affiliateId: string
  messageType: string
  channel: 'WhatsApp' | 'TikTok DM' | 'Instagram DM' | 'Email'
  templateContent?: string
}

export async function draftOutreachMessage(input: DraftMessageInput): Promise<{
  message: string
  provider: 'gemini' | 'template'
}> {
  const affiliate = await prisma.affiliate.findFirst({
    where: { id: input.affiliateId, deletedAt: null },
    include: {
      campaign: { select: { name: true } },
      pic: { select: { name: true } },
      contactHistory: { take: 3, orderBy: { contactDate: 'desc' } },
    },
  })

  if (!affiliate) {
    throw new Error('Affiliate not found')
  }

  const deadline = new Date(Date.now() + 14 * 86400000).toLocaleDateString('id-ID')
  const creatorContext = JSON.stringify({
    username: affiliate.username,
    name: affiliate.name,
    niche: affiliate.niche,
    followers: affiliate.followers,
    gmv: affiliate.gmv,
    status: affiliate.status,
    campaign: affiliate.campaign?.name,
    pic: affiliate.pic?.name,
    lastContact: affiliate.lastContactDate,
    recentContacts: affiliate.contactHistory.map(c => ({ channel: c.channel, date: c.contactDate, status: c.status })),
  }, null, 2)

  const model = getGeminiModel()
  if (model) {
    const prompt = `${CONTENT_STUDIO_PROMPT}${creatorContext}

Message Type: ${input.messageType}
Channel: ${input.channel}
${input.templateContent ? `Base Template (adapt and improve):\n${input.templateContent}` : ''}

Generate a personalized ${input.messageType} message for ${input.channel}. Include placeholder replacement: use @${affiliate.username} directly, deadline ${deadline} if relevant.`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      if (text.length > 20) {
        return { message: text, provider: 'gemini' }
      }
    } catch {
      // fall through to template
    }
  }

  const base = input.templateContent || getDefaultTemplate(input.messageType)
  const message = base
    .replace(/\[Username\]/g, `@${affiliate.username}`)
    .replace(/\[Deadline\]/g, deadline)
    .replace(/\[Nama\]/g, affiliate.name || affiliate.username)

  return { message, provider: 'template' }
}

function getDefaultTemplate(type: string): string {
  const templates: Record<string, string> = {
    introduction: `Halo kak @${'[Username]'}! 👋 Perkenalkan, saya dari SJ Kitchen. Kami tertarik ajak kolaborasi karena konten kakak cocok banget dengan brand makanan premium kami. Boleh diskusi lebih lanjut?`,
    'follow-up': `Halo kak @${'[Username]'}, follow up dari pesan sebelumnya ya. Apakah kakak tertarik untuk kolaborasi dengan SJ Kitchen? Deadline campaign: [Deadline].`,
    reminder: `Halo kak @${'[Username]'}! Reminder friendly — kami masih open untuk kolaborasi SJ Kitchen. Boleh reply ya kalau kakak interested 🙏`,
    're-approach': `Halo kak @${'[Username]'}! Sudah lama tidak connect — SJ Kitchen lagi buka kolaborasi baru. Apakah kakak open untuk discuss lagi?`,
    deal: `Halo kak @${'[Username]'}! Deal confirmation dari SJ Kitchen. Mohon konfirmasi detail kolaborasi sebelum [Deadline]. Terima kasih!`,
    'thank-you': `Terima kasih kak @${'[Username]'} atas kolaborasinya dengan SJ Kitchen! 🎉 Semoga sukses terus.`,
  }
  return templates[type] || templates.introduction
}
