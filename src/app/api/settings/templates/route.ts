import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { chatTemplateSchema } from '@/lib/validations'
import { getSessionUser } from '@/lib/auth'

// GET all templates
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.chatTemplate.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ success: true, data: templates })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch templates', error: error.message }, { status: 500 })
  }
}

// POST create/update template
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = chatTemplateSchema.parse(body)

    const template = await prisma.chatTemplate.create({
      data: parsed
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Validation failed' }, { status: 400 })
  }
}
