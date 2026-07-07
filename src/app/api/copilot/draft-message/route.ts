import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { draftOutreachMessage } from '@/lib/ai/content-studio'

const draftSchema = z.object({
  affiliateId: z.string().uuid(),
  messageType: z.string().default('introduction'),
  channel: z.enum(['WhatsApp', 'TikTok DM', 'Instagram DM', 'Email']).default('WhatsApp'),
  templateContent: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = draftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request', errors: parsed.error.flatten() }, { status: 400 })
    }

    const result = await draftOutreachMessage(parsed.data)
    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg === 'Affiliate not found' ? 404 : 500
    return NextResponse.json({ success: false, message: msg }, { status })
  }
}
