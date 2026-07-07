import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { buildCRMContext, buildFallbackResponse, formatContextForPrompt } from '@/lib/ai/context'
import { generateCopilotResponse, structuredToMarkdown } from '@/lib/ai/gemini'
import { buildChatPrompt } from '@/lib/ai/system-prompt'
import { generateSuggestedFollowUps } from '@/lib/ai/suggested-questions'
import type { CopilotPageContext } from '@/lib/ai/types'

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  context: z
    .object({
      page: z.string().optional(),
      affiliateId: z.string().optional(),
      dealId: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request', errors: parsed.error.flatten() }, { status: 400 })
    }

    const { message, conversationId, context } = parsed.data
    const pageContext = context as CopilotPageContext | undefined

    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        })
      : null

    if (conversationId && !conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 })
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 60),
          context: context ? JSON.stringify(context) : null,
        },
        include: { messages: true },
      })
    }

    await prisma.copilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    const history = conversation.messages.map(m => ({ role: m.role, content: m.content }))
    const snapshot = await buildCRMContext(message, pageContext)
    const crmContext = formatContextForPrompt(snapshot)
    const pageContextStr = pageContext
      ? `Page: ${pageContext.page || 'unknown'}${pageContext.affiliateId ? ` | Affiliate ID: ${pageContext.affiliateId}` : ''}${pageContext.dealId ? ` | Deal ID: ${pageContext.dealId}` : ''}`
      : 'Dashboard — general view'

    const prompt = buildChatPrompt({ crmContext, pageContext: pageContextStr, history, userMessage: message })
    const { structured, provider } = await generateCopilotResponse(prompt)

    const finalStructured = structured ?? buildFallbackResponse(snapshot)
    const assistantContent = structuredToMarkdown(finalStructured)
    const suggestedFollowUps = generateSuggestedFollowUps(message, snapshot, finalStructured)

    const assistantMessage = await prisma.copilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantContent,
        structured: JSON.stringify(finalStructured),
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: 'assistant' as const,
        content: assistantContent,
        structured: finalStructured,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      provider,
      suggestedFollowUps,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Copilot chat error:', error)
    return NextResponse.json({ success: false, message: 'Failed to process chat', error: msg }, { status: 500 })
  }
}
