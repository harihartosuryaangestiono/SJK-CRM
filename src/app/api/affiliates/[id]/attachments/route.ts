import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { createClient } from '@/utils/supabase/server'
import { logAudit } from '@/lib/audit'
import * as fs from 'fs'
import * as path from 'path'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const attachments = await prisma.fileAttachment.findMany({
      where: { affiliateId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: attachments })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch attachments', error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const fileType = formData.get('fileType') as string | null // SCREENSHOT, INVOICE, CONTRACT, etc.

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 })
    }

    const fileTypeString = fileType || 'SCREENSHOT'
    const fileName = file.name
    const fileSize = file.size
    const fileExtension = path.extname(fileName)
    const uniqueFileName = `${id}-${Date.now()}${fileExtension}`

    let fileUrl = ''

    // Dual-strategy file upload: Supabase Storage with local fallback
    try {
      const supabase = await createClient()
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data, error } = await supabase.storage
        .from('sjk-crm-attachments')
        .upload(uniqueFileName, buffer, {
          contentType: file.type,
          upsert: true
        })

      if (error) {
        throw new Error(error.message)
      }

      // Generate public URL
      const { data: publicUrlData } = supabase.storage
        .from('sjk-crm-attachments')
        .getPublicUrl(uniqueFileName)

      fileUrl = publicUrlData.publicUrl
    } catch (storageErr) {
      console.warn('Supabase storage upload failed, using local file storage fallback:', storageErr)
      
      // Local fallback
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const localPath = path.join(uploadDir, uniqueFileName)
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(localPath, buffer)

      fileUrl = `/uploads/${uniqueFileName}`
    }

    // Save attachment record in DB
    const attachment = await prisma.fileAttachment.create({
      data: {
        affiliateId: id,
        fileName,
        fileUrl,
        fileType: fileTypeString,
        fileSize,
        uploadedBy: user.name || user.email
      }
    })

    // Log Activity
    await prisma.activity.create({
      data: {
        affiliateId: id,
        userId: user.id,
        action: 'FILE_UPLOAD',
        details: `Uploaded ${fileTypeString.toLowerCase()} file: ${fileName}`
      }
    })

    // Log Audit
    await logAudit({
      req,
      userId: user.id,
      userName: user.name,
      entity: 'FileAttachment',
      entityId: attachment.id,
      action: 'CREATE',
      newValue: { fileName, fileUrl, fileType: fileTypeString }
    })

    return NextResponse.json({ success: true, data: attachment })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Upload failed', error: error.message }, { status: 500 })
  }
}
