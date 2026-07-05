import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || 'all'
    const entity = searchParams.get('entity') || 'all'
    const userIdFilter = searchParams.get('userId') || 'all'
    
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter by action
    if (action !== 'all') {
      where.action = action
    }

    // Filter by entity
    if (entity !== 'all') {
      where.entity = entity
    }

    // Filter by user performing action
    if (userIdFilter !== 'all') {
      where.userId = userIdFilter
    }

    // Fuzzy search across userName, entityId, browser, ipAddress, oldValue, newValue
    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { browser: { contains: search, mode: 'insensitive' } },
        { oldValue: { contains: search, mode: 'insensitive' } },
        { newValue: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch audit logs', error: error.message }, { status: 500 })
  }
}
