import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const tables = [
  'User',
  'Session',
  'Affiliate',
  'Campaign',
  'Deal',
  'ChatTemplate',
  'ContactHistory',
  'Note',
  'Tag',
  'Activity',
  'StatusHistory',
  'Notification',
  'Task',
  'ImportLog',
  'ExportLog',
  'ReminderSchedule',
]

async function main() {
  console.log('Enabling Row Level Security (RLS) on all tables...')

  for (const table of tables) {
    try {
      // Enable RLS
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`)
      console.log(`Enabled RLS for table: ${table}`)

      // Create a default policy to allow authenticated users to do everything
      // (Since Prisma connects as the superuser 'postgres', it bypasses RLS by default.
      // However, enabling RLS protects the database from anonymous client API connections)
      await prisma.$executeRawUnsafe(`
        DROP POLICY IF EXISTS "${table}_auth_policy" ON "${table}";
      `)
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "${table}_auth_policy" ON "${table}" 
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
      `)
      console.log(`Created default auth policy for table: ${table}`)
    } catch (e: any) {
      console.error(`Failed to enable RLS/policy for table ${table}:`, e.message)
    }
  }

  console.log('RLS configuration completed successfully.')
}

main()
  .catch((e) => {
    console.error('Error in RLS configuration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
