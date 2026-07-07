import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type ResolvedRow = {
  action: 'MERGE' | 'REPLACE' | 'SKIP' | 'CREATE_NEW'
  incoming: {
    username: string
    name?: any
    niche?: any
    profileLink?: any
    waContact?: any
    followers?: any
    gmv?: any
    period?: any
    activation?: any
    curated?: any
    curate?: any
    contactConfirmation?: any
    affiliateConfirmation?: any
    remarks?: any
    email?: any
    instagram?: any
    status?: any
  }
  existingId?: string
}

function parseCurated(incoming: ResolvedRow['incoming']): boolean {
  if (incoming.curated === true || incoming.curated === 'true') return true
  const val = incoming.curate ?? incoming.curated
  if (!val) return false
  const lower = String(val).toLowerCase().trim()
  return ['sudah', 'yes', 'true', '1', 'sudah dikurasi', 'sudahdikurasi'].includes(lower)
}

function normalizeStatus(status: any): string {
  if (status === undefined || status === null) return 'Belum Dihubungi'
  const s = String(status).trim()
  if (!s) return 'Belum Dihubungi'
  if (s === 'Menunggu Balasan') return 'Sudah Dihubungi'
  return s
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { resolutions } = body as { resolutions: ResolvedRow[] }

    if (!resolutions || !Array.isArray(resolutions)) {
      return NextResponse.json({ message: 'Resolutions array is required' }, { status: 400 })
    }

    let mergedCount = 0
    let replacedCount = 0
    let createdCount = 0
    let skippedCount = 0

    // Helper to parse Followers/GMV numbers
    const parseFollowers = (val: any): number => {
      if (!val) return 0
      let str = String(val).trim().toLowerCase()
      let multiplier = 1
      if (str.endsWith('rb') || str.endsWith('k')) {
        multiplier = 1000
        str = str.replace(/(rb|k)/g, '')
      } else if (str.endsWith('jt') || str.endsWith('m')) {
        multiplier = 1000000
        str = str.replace(/(jt|m)/g, '')
      }
      return Math.floor(parseFloat(str) * multiplier) || 0
    }

    const parseGMV = (val: any): number => {
      if (!val) return 0.0
      let str = String(val).trim().toLowerCase()
      let multiplier = 1.0
      if (str.endsWith('rb') || str.endsWith('k')) {
        multiplier = 1000.0
        str = str.replace(/(rb|k)/g, '')
      } else if (str.endsWith('jt') || str.endsWith('m')) {
        multiplier = 1000000.0
        str = str.replace(/(jt|m)/g, '')
      }
      return parseFloat(str) * multiplier || 0.0
    }

    // Helper to guarantee value is either string or null (never number/boolean directly to Prisma string fields)
    const ensureString = (val: any): string | null => {
      if (val === undefined || val === null) return null
      const str = String(val).trim()
      return str === '' ? null : str
    }

    // 1. Pre-fetch existing records to avoid query in loop
    const existingIds = resolutions.map(r => r.existingId).filter(Boolean) as string[]
    const existingRecords = existingIds.length > 0
      ? await prisma.affiliate.findMany({ where: { id: { in: existingIds } } })
      : []

    // 2. Pre-fetch all active usernames to resolve CREATE_NEW suffixes in memory
    const dbUsernames = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      select: { username: true }
    })
    const usernameSet = new Set(dbUsernames.map(u => u.username.toLowerCase()))

    for (const res of resolutions) {
      const { action, incoming, existingId } = res
      const username = String(incoming.username || '').trim().replace(/^@/, '')
      
      if (!username) continue

      const followersCount = parseFollowers(incoming.followers)
      const gmvCount = parseGMV(incoming.gmv)

      if (action === 'SKIP') {
        skippedCount++
        continue
      }

      if (action === 'MERGE' && existingId) {
        const existing = existingRecords.find(r => r.id === existingId)
        if (existing) {
          const updateData: any = {}
          if (!existing.name && incoming.name !== undefined) updateData.name = ensureString(incoming.name)
          if (!existing.niche && incoming.niche !== undefined) updateData.niche = ensureString(incoming.niche)
          if (!existing.waContact && incoming.waContact !== undefined) updateData.waContact = ensureString(incoming.waContact)
          if (!existing.email && incoming.email !== undefined) updateData.email = ensureString(incoming.email)
          if (!existing.instagram && incoming.instagram !== undefined) updateData.instagram = ensureString(incoming.instagram)
          if (!existing.remarks && incoming.remarks !== undefined) updateData.remarks = ensureString(incoming.remarks)
          if (existing.followersCount === 0 && incoming.followers !== undefined) {
            updateData.followers = ensureString(incoming.followers)
            updateData.followersCount = followersCount
          }
          if (existing.gmvCount === 0 && incoming.gmv !== undefined) {
            updateData.gmv = ensureString(incoming.gmv)
            updateData.gmvCount = gmvCount
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.affiliate.update({
              where: { id: existingId },
              data: updateData
            })
            
            await prisma.activity.create({
              data: {
                affiliateId: existingId,
                userId: user.id,
                action: 'MERGE_RESOLVE',
                details: `Merged fields from spreadsheet import: ${Object.keys(updateData).join(', ')}`
              }
            })

            await logAudit({
              req,
              userId: user.id,
              userName: user.name,
              entity: 'Affiliate',
              entityId: existingId,
              action: 'UPDATE',
              oldValue: existing,
              newValue: updateData
            })
          }
          mergedCount++
        }
      } 
      
      else if (action === 'REPLACE' && existingId) {
        const existing = existingRecords.find(r => r.id === existingId)
        if (existing) {
          const updateData = {
            name: ensureString(incoming.name),
            niche: ensureString(incoming.niche) || 'Food & Beverages',
            profileLink: ensureString(incoming.profileLink) || `https://www.tiktok.com/@${username}`,
            waContact: ensureString(incoming.waContact),
            followers: ensureString(incoming.followers),
            followersCount,
            gmv: ensureString(incoming.gmv),
            gmvCount,
            period: ensureString(incoming.period),
            activation: ensureString(incoming.activation),
            curated: parseCurated(incoming),
            contactConfirmation: ensureString(incoming.contactConfirmation),
            affiliateConfirmation: ensureString(incoming.affiliateConfirmation),
            remarks: ensureString(incoming.remarks),
            email: ensureString(incoming.email),
            instagram: ensureString(incoming.instagram),
            status: normalizeStatus(incoming.status)
          }

          await prisma.affiliate.update({
            where: { id: existingId },
            data: updateData
          })

          await prisma.activity.create({
            data: {
              affiliateId: existingId,
              userId: user.id,
              action: 'REPLACE_RESOLVE',
              details: `Replaced creator profile details completely via import`
            }
          })

          await logAudit({
            req,
            userId: user.id,
            userName: user.name,
            entity: 'Affiliate',
            entityId: existingId,
            action: 'UPDATE',
            oldValue: existing,
            newValue: updateData
          })

          replacedCount++
        }
      } 
      
      else if (action === 'CREATE_NEW' || !existingId) {
        // Handle unique username suffixing in memory
        let uniqueUsername = username
        let counter = 1
        
        while (usernameSet.has(uniqueUsername.toLowerCase())) {
          uniqueUsername = `${username}-${counter}`
          counter++
        }
        usernameSet.add(uniqueUsername.toLowerCase())

        const newAff = await prisma.affiliate.create({
          data: {
            username: uniqueUsername,
            name: ensureString(incoming.name),
            niche: ensureString(incoming.niche) || 'Food & Beverages',
            profileLink: ensureString(incoming.profileLink) || `https://www.tiktok.com/@${uniqueUsername}`,
            waContact: ensureString(incoming.waContact),
            followers: ensureString(incoming.followers),
            followersCount,
            gmv: ensureString(incoming.gmv),
            gmvCount,
            period: ensureString(incoming.period),
            activation: ensureString(incoming.activation),
            curated: parseCurated(incoming),
            contactConfirmation: ensureString(incoming.contactConfirmation),
            affiliateConfirmation: ensureString(incoming.affiliateConfirmation),
            remarks: ensureString(incoming.remarks),
            email: ensureString(incoming.email),
            instagram: ensureString(incoming.instagram),
            status: normalizeStatus(incoming.status),
            picId: user.id
          }
        })

        await prisma.activity.create({
          data: {
            affiliateId: newAff.id,
            userId: user.id,
            action: 'CREATE_RESOLVE',
            details: `Imported creator @${uniqueUsername} with duplicate resolution`
          }
        })

        await logAudit({
          req,
          userId: user.id,
          userName: user.name,
          entity: 'Affiliate',
          entityId: newAff.id,
          action: 'CREATE',
          newValue: newAff
        })

        createdCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Duplicate resolution completed. Created: ${createdCount}, Merged: ${mergedCount}, Replaced: ${replacedCount}, Skipped: ${skippedCount}`,
      summary: { createdCount, mergedCount, replacedCount, skippedCount }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to import resolved rows', error: error.message }, { status: 500 })
  }
}
