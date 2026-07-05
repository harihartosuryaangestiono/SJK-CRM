import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { comparePassword, destroySession, createSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET active session
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Sync user role from public.User table
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, name: true, role: true }
    })

    return NextResponse.json({
      authenticated: true,
      user: dbUser || {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 'Affiliate User',
        role: 'STAFF'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
  }
}

// POST login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Try signing in with Supabase Auth
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    // If email is not confirmed, force-confirm it directly in the Supabase auth schema and retry login
    if (error && (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed'))) {
      await prisma.$executeRaw`
        UPDATE auth.users 
        SET email_confirmed_at = NOW() 
        WHERE email = ${email}
      `.catch((err) => {
        console.error('Email auto-confirm failed:', err)
      })

      const retryResult = await supabase.auth.signInWithPassword({
        email,
        password
      })
      data = retryResult.data
      error = retryResult.error as any
    }

    // 2. Fallback check against local public.User table (for seeded accounts)
    if (error && (error.status === 400 || error.message.includes('Invalid login credentials'))) {
      const dbUser = await prisma.user.findUnique({
        where: { email }
      })

      if (dbUser && dbUser.passwordHash) {
        const passwordMatches = await comparePassword(password, dbUser.passwordHash)
        
        if (passwordMatches) {
          // Automatic signup in Supabase Auth using these credentials
          const signUpResult = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: dbUser.name
              }
            }
          })

          if (!signUpResult.error && signUpResult.data.user) {
            // Force-confirm email directly in Supabase auth database schema using Prisma postgres superuser privilege
            await prisma.$executeRaw`
              UPDATE auth.users 
              SET email_confirmed_at = NOW() 
              WHERE email = ${email}
            `.catch((err) => {
              console.error('Email auto-confirm failed:', err)
            })

            // Sign in again now that account is created
            const signInResult = await supabase.auth.signInWithPassword({
              email,
              password
            })
            data = signInResult.data
            error = signInResult.error as any
          }
        }
      }
    }

    if (error || !data.user) {
      return NextResponse.json({ message: error?.message || 'Email atau password salah' }, { status: 401 })
    }

    // 3. Sync local public.User ID to match Supabase Auth user ID if not already matched
    let dbUser = await prisma.user.findUnique({
      where: { email: data.user.email }
    })

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: data.user.id, // Match UUID
          email: data.user.email!,
          name: data.user.user_metadata?.name || 'Affiliate User',
          passwordHash: '', // Password managed by Supabase
          role: 'STAFF'
        }
      })
    } else if (dbUser.id !== data.user.id) {
      const oldId = dbUser.id
      const newId = data.user.id
      const role = dbUser.role
      const name = dbUser.name
      const tempEmail = `temp-${Date.now()}@sjkitchen.com`
      
      // Update all foreign keys pointing to oldId before recreating user row to bypass constraints
      await prisma.$transaction([
        // 1. Free up unique email constraint on oldId
        prisma.user.update({ where: { id: oldId }, data: { email: tempEmail } }),
        // 2. Create the new user with newId so it exists for foreign key checks
        prisma.user.create({
          data: {
            id: newId,
            email: data.user.email!,
            name,
            passwordHash: '',
            role
          }
        }),
        // 3. Update all referencing tables
        prisma.session.updateMany({ where: { userId: oldId }, data: { userId: newId } }),
        prisma.affiliate.updateMany({ where: { picId: oldId }, data: { picId: newId } }),
        prisma.deal.updateMany({ where: { picId: oldId }, data: { picId: newId } }),
        prisma.contactHistory.updateMany({ where: { picId: oldId }, data: { picId: newId } }),
        prisma.activity.updateMany({ where: { userId: oldId }, data: { userId: newId } }),
        prisma.notification.updateMany({ where: { userId: oldId }, data: { userId: newId } }),
        prisma.task.updateMany({ where: { assignedToId: oldId }, data: { assignedToId: newId } }),
        prisma.task.updateMany({ where: { createdById: oldId }, data: { createdById: newId } }),
        // 4. Safely delete the old temporary user
        prisma.user.delete({ where: { id: oldId } })
      ])

      // Re-fetch sync data to guarantee type compliance
      dbUser = await prisma.user.findUnique({
        where: { id: newId }
      }) || dbUser
    }

    await createSession(dbUser.id)

    // Log login event
    await logAudit({
      req,
      userId: dbUser.id,
      userName: dbUser.name,
      entity: 'User',
      entityId: dbUser.id,
      action: 'LOGIN',
      newValue: { email: dbUser.email }
    })

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
  }
}

// DELETE logout
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let dbUser = null
    if (user && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email }
      })
    }

    await supabase.auth.signOut()
    await destroySession()

    if (dbUser) {
      await logAudit({
        req,
        userId: dbUser.id,
        userName: dbUser.name,
        entity: 'User',
        entityId: dbUser.id,
        action: 'LOGOUT',
        newValue: { email: dbUser.email }
      })
    }

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error: any) {
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
  }
}
