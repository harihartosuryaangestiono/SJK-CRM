import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { rows } = body // Expected array of parsed rows from Excel import

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ message: 'Rows array is required' }, { status: 400 })
    }

    // 1. Collect all potential search inputs to query database once
    const usernames: string[] = []
    const waContacts: string[] = []
    const emails: string[] = []
    const profileLinks: string[] = []

    for (const row of rows) {
      const uname = String(row.username || '').trim().replace(/^@/, '')
      if (uname) usernames.push(uname)
      
      const wa = row.waContact ? String(row.waContact).trim() : null
      if (wa) waContacts.push(wa)
      
      const mail = row.email ? String(row.email).trim() : null
      if (mail) emails.push(mail)
      
      const link = row.profileLink ? String(row.profileLink).trim() : null
      if (link) profileLinks.push(link)
    }

    if (usernames.length === 0) {
      return NextResponse.json({ success: true, duplicates: [] })
    }

    // 2. Fetch all conflicting records from the DB in a single query
    const conflicts = await prisma.affiliate.findMany({
      where: {
        deletedAt: null,
        OR: [
          { username: { in: usernames, mode: 'insensitive' as const } },
          ...(waContacts.length > 0 ? [{ waContact: { in: waContacts } }] : []),
          ...(emails.length > 0 ? [{ email: { in: emails, mode: 'insensitive' as const } }] : []),
          ...(profileLinks.length > 0 ? [{ profileLink: { in: profileLinks, mode: 'insensitive' as const } }] : [])
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        waContact: true,
        email: true,
        profileLink: true,
        status: true
      }
    })

    const results = []

    // 3. Match in memory to identify which row maps to which database conflict
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const username = String(row.username || '').trim().replace(/^@/, '')
      const waContact = row.waContact ? String(row.waContact).trim() : null
      const email = row.email ? String(row.email).trim() : null
      const profileLink = row.profileLink ? String(row.profileLink).trim() : null

      if (!username) continue

      const conflict = conflicts.find(c => 
        c.username.toLowerCase() === username.toLowerCase() ||
        (waContact && c.waContact === waContact) ||
        (email && c.email?.toLowerCase() === email.toLowerCase()) ||
        (profileLink && c.profileLink?.toLowerCase() === profileLink.toLowerCase())
      )

      if (conflict) {
        const reasons = []
        if (conflict.username.toLowerCase() === username.toLowerCase()) reasons.push('Username')
        if (waContact && conflict.waContact === waContact) reasons.push('WhatsApp Contact')
        if (email && conflict.email?.toLowerCase() === email.toLowerCase()) reasons.push('Email')
        if (profileLink && conflict.profileLink?.toLowerCase() === profileLink.toLowerCase()) reasons.push('TikTok URL')

        results.push({
          index: i,
          incoming: row,
          existing: conflict,
          reasons
        })
      }
    }

    return NextResponse.json({ success: true, duplicates: results })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Duplicate checking failed', error: error.message }, { status: 500 })
  }
}
