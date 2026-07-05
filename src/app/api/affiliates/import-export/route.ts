import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { parseExcelRowToAffiliate, exportToExcel } from '@/lib/excel-utils'
import { logAudit } from '@/lib/audit'

// GET: Export entire database as Excel file download
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all active affiliates
    const affiliates = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })

    // Generate buffer using our helper
    const buffer = exportToExcel(affiliates)

    // Log the export event
    await prisma.exportLog.create({
      data: {
        format: 'XLSX',
        rowCount: affiliates.length
      }
    })

    await logAudit({
      req,
      userId: user.id,
      userName: user.name,
      entity: 'ExportLog',
      entityId: 'BulkExport',
      action: 'EXPORT',
      newValue: { format: 'XLSX', rowCount: affiliates.length }
    })

    // Return as file download stream
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Affiliate_SJ_Kitchen.xlsx"',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Export failed', error: error.message }, { status: 500 })
  }
}

// POST: Import Excel file and bulk insert into database
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    
    // Retrieve sheet
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('creator') || name.toLowerCase().includes('listing')) || workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    if (!sheet) {
      return NextResponse.json({ message: 'No sheet containing creator data was found.' }, { status: 400 })
    }

    // Convert sheet to JSON rows (ignoring the merged header at Row 1, start parsing from Row 2)
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { range: 1 })
    
    if (rawRows.length === 0) {
      return NextResponse.json({ message: 'Excel file is empty' }, { status: 400 })
    }

    const parsedAffiliates: any[] = []
    const uniqueUsernames = new Set<string>()

    // Query existing usernames in db to avoid duplicates
    const existingCreators = await prisma.affiliate.findMany({
      where: { deletedAt: null },
      select: { username: true }
    })
    const existingUsernames = new Set(existingCreators.map(c => c.username.toLowerCase()))

    for (const row of rawRows) {
      const usernameRaw = String(row['Username'] || '').trim().replace(/^@/, '')
      
      if (!usernameRaw || usernameRaw === 'None' || usernameRaw === 'undefined') {
        continue
      }
      
      const usernameLower = usernameRaw.toLowerCase()
      if (uniqueUsernames.has(usernameLower) || existingUsernames.has(usernameLower)) {
        continue // Skip duplicate usernames in current file or database
      }
      uniqueUsernames.add(usernameLower)

      // Parse using helper
      const parsed = parseExcelRowToAffiliate(row)
      
      parsedAffiliates.push({
        ...parsed,
        picId: user.id // Default PIC to importing user
      })
    }

    let insertedCount = 0
    if (parsedAffiliates.length > 0) {
      // Bulk insert using skipDuplicates to prevent collision
      const result = await prisma.affiliate.createMany({
        data: parsedAffiliates,
        skipDuplicates: true
      })
      insertedCount = result.count

      // Log activity trails
      const activities = parsedAffiliates.map(aff => ({
        userId: user.id,
        action: 'IMPORT_ROW',
        details: `Imported creator @${aff.username} via file '${file.name}'`
      }))
      
      // Limit seeding activity logs to first 10 rows to prevent activity spam
      await prisma.activity.createMany({ data: activities.slice(0, 10) })
    }

    // Log the import event
    await prisma.importLog.create({
      data: {
        fileName: file.name,
        status: 'SUCCESS',
        rowCount: insertedCount
      }
    })

    await logAudit({
      req,
      userId: user.id,
      userName: user.name,
      entity: 'ImportLog',
      entityId: file.name,
      action: 'IMPORT',
      newValue: { fileName: file.name, rowCount: insertedCount }
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor data. ${insertedCount} creator baru berhasil ditambahkan.`,
      count: insertedCount
    })
  } catch (error: any) {
    // Log failed import event
    await prisma.importLog.create({
      data: {
        fileName: 'Unknown File',
        status: 'FAILED',
        rowCount: 0,
        errors: error.message
      }
    }).catch(() => {})

    return NextResponse.json({ success: false, message: 'Import failed', error: error.message }, { status: 500 })
  }
}
