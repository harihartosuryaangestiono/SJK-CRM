import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 })
    }

    const messages = conversation.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      structured: m.structured ? JSON.parse(m.structured) : null,
      createdAt: m.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        pinned: conversation.pinned,
        context: conversation.context ? JSON.parse(conversation.context) : null,
        messages,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to fetch conversation', error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 })
    }

    await prisma.conversation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to delete conversation', error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { pinned, title } = body

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 })
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(typeof pinned === 'boolean' ? { pinned } : {}),
        ...(typeof title === 'string' ? { title: title.slice(0, 120) } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to update conversation', error: msg }, { status: 500 })
  }
}
