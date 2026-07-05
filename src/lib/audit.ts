import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'

type AuditParams = {
  req?: NextRequest
  userId?: string | null
  userName?: string | null
  entity: string
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'IMPORT' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'UPDATE_STATUS' | 'UPDATE_PIC' | 'UPDATE_WA' | 'UPDATE_USERNAME' | 'UPDATE_NOTES'
  oldValue?: any
  newValue?: any
}

export async function logAudit({
  req,
  userId,
  userName,
  entity,
  entityId,
  action,
  oldValue,
  newValue
}: AuditParams) {
  try {
    let ipAddress = '127.0.0.1'
    let browser = 'System / API'

    if (req) {
      // Parse IP Address
      const xForwardedFor = req.headers.get('x-forwarded-for')
      if (xForwardedFor) {
        ipAddress = xForwardedFor.split(',')[0].trim()
      } else {
        ipAddress = (req as any).ip || '127.0.0.1'
      }

      // Parse User Agent
      browser = req.headers.get('user-agent') || 'Unknown Browser'
    }

    // Convert old/new values to string if they are objects
    const oldStr = oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null
    const newStr = newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null

    // Create Audit Log row
    const log = await prisma.auditLog.create({
      data: {
        userId,
        userName,
        entity,
        entityId,
        action,
        oldValue: oldStr,
        newValue: newStr,
        ipAddress,
        browser
      }
    })
    
    return log
  } catch (err) {
    console.error('Failed to log audit event:', err)
    return null
  }
}
