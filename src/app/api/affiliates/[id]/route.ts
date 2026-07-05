import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type Props = {
  params: Promise<{ id: string }>
}

// GET detailed affiliate profile
export async function GET(req: NextRequest, { params }: Props) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const affiliate = await prisma.affiliate.findUnique({
      where: { id, deletedAt: null },
      include: {
        pic: {
          select: { id: true, name: true, email: true, role: true }
        },
        campaign: {
          select: { id: true, name: true, status: true }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true } }
          }
        },
        contactHistory: {
          orderBy: { contactDate: 'desc' },
          include: {
            pic: { select: { name: true } }
          }
        },
        deals: {
          orderBy: { dealDate: 'desc' },
          include: {
            campaign: { select: { name: true } }
          }
        }
      }
    })

    if (!affiliate) {
      return NextResponse.json({ message: 'Affiliate not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: affiliate })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch affiliate profile', error: error.message }, { status: 500 })
  }
}

// PATCH update affiliate profile details
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Retrieve current state for diff logs
    const current = await prisma.affiliate.findUnique({
      where: { id }
    })

    if (!current) {
      return NextResponse.json({ message: 'Affiliate not found' }, { status: 404 })
    }

    // Prepare fields to update
    const {
      name,
      niche,
      waContact,
      email,
      instagram,
      status,
      priority,
      picId,
      campaignId,
      remarks,
      followers,
      gmv,
      lastContactDate,
      lastFollowUpDate,
      blacklistReason,
      blacklistNotes
    } = body

    const updateData: any = {}
    const auditLogs: string[] = []

    if (name !== undefined && name !== current.name) {
      updateData.name = name
      auditLogs.push(`name updated to '${name}'`)
    }
    if (niche !== undefined && niche !== current.niche) {
      updateData.niche = niche
      auditLogs.push(`niche updated to '${niche}'`)
    }
    if (waContact !== undefined && waContact !== current.waContact) {
      updateData.waContact = waContact
      auditLogs.push(`WhatsApp contact updated`)
    }
    if (email !== undefined && email !== current.email) {
      updateData.email = email
      auditLogs.push(`email updated`)
    }
    if (instagram !== undefined && instagram !== current.instagram) {
      updateData.instagram = instagram
      auditLogs.push(`Instagram username updated to '${instagram}'`)
    }
    if (priority !== undefined && priority !== current.priority) {
      updateData.priority = priority
      auditLogs.push(`priority updated to '${priority}'`)
    }
    if (remarks !== undefined && remarks !== current.remarks) {
      updateData.remarks = remarks
      auditLogs.push(`remarks updated`)
    }
    if (followers !== undefined && followers !== current.followers) {
      updateData.followers = followers
      const rawLower = String(followers).trim().toLowerCase()
      let count = 0
      if (rawLower.endsWith('rb') || rawLower.endsWith('k')) count = parseFloat(rawLower) * 1000
      else if (rawLower.endsWith('jt') || rawLower.endsWith('m')) count = parseFloat(rawLower) * 1000000
      else count = parseFloat(rawLower) || 0
      updateData.followersCount = count
    }
    if (gmv !== undefined && gmv !== current.gmv) {
      updateData.gmv = gmv
      let count = 0
      const rawLower = String(gmv).trim().toLowerCase()
      if (rawLower.endsWith('rb') || rawLower.endsWith('k')) count = parseFloat(rawLower) * 1000
      else if (rawLower.endsWith('jt') || rawLower.endsWith('m')) count = parseFloat(rawLower) * 1000000
      else count = parseFloat(rawLower) || 0
      updateData.gmvCount = count
    }
    if (lastContactDate !== undefined && lastContactDate !== (current.lastContactDate ? new Date(current.lastContactDate).toISOString() : null)) {
      updateData.lastContactDate = lastContactDate ? new Date(lastContactDate) : null
      auditLogs.push(`last contact date updated`)
    }
    if (lastFollowUpDate !== undefined && lastFollowUpDate !== (current.lastFollowUpDate ? new Date(current.lastFollowUpDate).toISOString() : null)) {
      updateData.lastFollowUpDate = lastFollowUpDate ? new Date(lastFollowUpDate) : null
      auditLogs.push(`last follow up date updated`)
    }
    if (blacklistReason !== undefined && blacklistReason !== current.blacklistReason) {
      updateData.blacklistReason = blacklistReason
      auditLogs.push(`blacklistReason updated`)
    }
    if (blacklistNotes !== undefined && blacklistNotes !== current.blacklistNotes) {
      updateData.blacklistNotes = blacklistNotes
      auditLogs.push(`blacklistNotes updated`)
    }

    // Status change logic
    if (status !== undefined && status !== current.status) {
      updateData.status = status
      auditLogs.push(`status changed from '${current.status}' to '${status}'`)
      
      // Log to status history table
      await prisma.statusHistory.create({
        data: {
          affiliateId: id,
          oldStatus: current.status,
          newStatus: status
        }
      })

      // Create ContactHistory record for contact-type status changes
      const contactStatuses = ['Sudah Dihubungi', 'Menunggu Balasan', 'No Response', 'Follow Up 1', 'Follow Up 2']
      if (contactStatuses.includes(status)) {
        const contactVia = body.contactVia || 'whatsapp'
        await prisma.contactHistory.create({
          data: {
            affiliateId: id,
            picId: user.id,
            contactDate: lastContactDate ? new Date(lastContactDate) : new Date(),
            channel: contactVia,
            status: status, // Maps to ContactHistory.status field
            notes: `Status berubah ke ${status}`
          }
        }).catch((e: any) => console.warn('ContactHistory create skipped:', e.message))
      }


      if (status === 'Blacklist') {
        updateData.blacklistDate = new Date()
      } else {
        updateData.blacklistDate = null
        updateData.blacklistReason = null
        updateData.blacklistNotes = null
      }

      if (status === 'Deal') {
        const campaignIdToUse = campaignId || current.campaignId
        if (campaignIdToUse) {
          const existingDeal = await prisma.deal.findFirst({
            where: {
              affiliateId: id,
              campaignId: campaignIdToUse,
              deletedAt: null
            }
          })
          if (!existingDeal) {
            await prisma.deal.create({
              data: {
                affiliateId: id,
                campaignId: campaignIdToUse,
                picId: picId || current.picId || user.id,
                nominal: 0.0,
                product: 'Sample Product',
                targetVideo: 1,
                statusCampaign: 'In Progress',
                progressCampaign: 'NOT_STARTED'
              }
            })
            auditLogs.push('created Deal & SOW campaign')
          }
        }
      }
    }


    // Campaign assignment logic
    if (campaignId !== undefined && campaignId !== current.campaignId) {
      updateData.campaignId = campaignId || null
      const campaignName = campaignId ? await prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true } }).then(c => c?.name) : 'None'
      auditLogs.push(`moved to campaign '${campaignName}'`)
    }

    // PIC assignment logic
    if (picId !== undefined && picId !== current.picId) {
      updateData.picId = picId || null
      const picName = picId ? await prisma.user.findUnique({ where: { id: picId }, select: { name: true } }).then(u => u?.name) : 'Unassigned'
      auditLogs.push(`PIC changed to ${picName}`)
    }

    // Perform database update
    const updated = await prisma.affiliate.update({
      where: { id },
      data: updateData
    })

    // Log activities in single details block or multiple logs
    if (auditLogs.length > 0) {
      await prisma.activity.create({
        data: {
          affiliateId: id,
          userId: user.id,
          action: 'PROFILE_UPDATE',
          details: `Updated creator profile: ${auditLogs.join(', ')}`
        }
      })

      // Determine specific action type
      let actionType: 'UPDATE' | 'UPDATE_STATUS' | 'UPDATE_PIC' | 'UPDATE_WA' | 'UPDATE_USERNAME' = 'UPDATE'
      if (status !== undefined && status !== current.status) {
        actionType = 'UPDATE_STATUS'
      } else if (picId !== undefined && picId !== current.picId) {
        actionType = 'UPDATE_PIC'
      } else if (waContact !== undefined && waContact !== current.waContact) {
        actionType = 'UPDATE_WA'
      }

      const oldVals: any = {}
      const newVals: any = {}
      Object.keys(updateData).forEach(key => {
        oldVals[key] = (current as any)[key]
        newVals[key] = updateData[key]
      })

      await logAudit({
        req,
        userId: user.id,
        userName: user.name,
        entity: 'Affiliate',
        entityId: id,
        action: actionType,
        oldValue: oldVals,
        newValue: newVals
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('PATCH Affiliate error:', error)
    return NextResponse.json({ success: false, message: 'Update failed', error: error.message }, { status: 500 })
  }
}

// POST create note on affiliate profile
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { content } = body

    if (!content || String(content).trim() === '') {
      return NextResponse.json({ message: 'Note content cannot be empty' }, { status: 400 })
    }

    // Add note
    const note = await prisma.note.create({
      data: {
        affiliateId: id,
        content: String(content).trim()
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        affiliateId: id,
        userId: user.id,
        action: 'NOTE_ADD',
        details: `Added a note: "${content.length > 40 ? content.substring(0, 40) + '...' : content}"`
      }
    })

    // Log audit
    await logAudit({
      req,
      userId: user.id,
      userName: user.name,
      entity: 'Note',
      entityId: note.id,
      action: 'UPDATE_NOTES',
      newValue: { content }
    })

    return NextResponse.json({ success: true, data: note })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to create note', error: error.message }, { status: 500 })
  }
}
