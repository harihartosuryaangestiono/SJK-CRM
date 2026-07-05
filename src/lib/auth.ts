import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { Role } from '@prisma/client'

const SESSION_COOKIE_NAME = 'sjk_crm_session'

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string) {
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return token
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await prisma.session.delete({
      where: { sessionToken: token },
    }).catch(() => {}) // Ignore if already deleted
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  })

  if (!session) return null

  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    cookieStore.delete(SESSION_COOKIE_NAME)
    return null
  }

  return session.user
}

export async function hasRole(requiredRoles: Role[]) {
  const user = await getSessionUser()
  if (!user) return false
  return requiredRoles.includes(user.role)
}

export async function requireAuth(requiredRoles?: Role[]) {
  const user = await getSessionUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }

  return user
}
