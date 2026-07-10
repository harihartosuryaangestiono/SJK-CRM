import { PrismaClient, Role, Priority, CampaignStatus, ProgressCampaignStatus } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Inline parser helpers (copied from excel-utils to keep seed standalone)
function parseIndonesianDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  
  const str = String(val).trim().toLowerCase()
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed

  const indonesianMonths: Record<string, number> = {
    'jan': 0, 'januari': 0, 'feb': 1, 'februari': 1, 'mar': 2, 'maret': 2,
    'apr': 3, 'april': 3, 'mei': 4, 'may': 4, 'jun': 5, 'juni': 5,
    'jul': 6, 'juli': 6, 'agu': 7, 'agustus': 7, 'aug': 7, 'sep': 8, 'september': 8,
    'okt': 9, 'oktober': 9, 'oct': 9, 'nov': 10, 'november': 10, 'des': 11, 'desember': 11, 'dec': 11
  }

  const parts = str.replace(/,/g, '').split(/\s+/)
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10)
    const monthStr = parts[1]
    const year = parseInt(parts[2], 10)
    
    const month = indonesianMonths[monthStr]
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day)
    }
  }
  return null
}

function parseFollowers(val: any): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return Math.floor(val)
  let str = String(val).trim().toLowerCase().replace(/,/g, '.')
  let multiplier = 1
  if (str.endsWith('rb') || str.endsWith('k')) {
    multiplier = 1000
    str = str.replace(/(rb|k)/g, '').trim()
  } else if (str.endsWith('jt') || str.endsWith('m')) {
    multiplier = 1000000
    str = str.replace(/(jt|m)/g, '').trim()
  } else if (str.endsWith('b')) {
    multiplier = 1000000000
    str = str.replace(/b/g, '').trim()
  }
  const num = parseFloat(str)
  return isNaN(num) ? 0 : Math.floor(num * multiplier)
}

function parseGMV(val: any): number {
  if (val === null || val === undefined) return 0.0
  if (typeof val === 'number') return val
  let str = String(val).trim().toLowerCase().replace(/,/g, '.')
  let multiplier = 1.0
  if (str.endsWith('rb') || str.endsWith('k')) {
    multiplier = 1000.0
    str = str.replace(/(rb|k)/g, '').trim()
  } else if (str.endsWith('jt') || str.endsWith('m')) {
    multiplier = 1000000.0
    str = str.replace(/(jt|m)/g, '').trim()
  } else if (str.endsWith('b')) {
    multiplier = 1000000000.0
    str = str.replace(/b/g, '').trim()
  }
  const num = parseFloat(str)
  return isNaN(num) ? 0.0 : num * multiplier
}

async function main() {
  console.log('Clearing database...')
  await prisma.session.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.statusHistory.deleteMany()
  await prisma.contactHistory.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.task.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.note.deleteMany()
  await prisma.affiliate.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.chatTemplate.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tag.deleteMany()
  
  console.log('Seeding Chat Templates...')
  await prisma.chatTemplate.createMany({
    data: [
      {
        name: 'Template Perkenalan (WhatsApp)',
        type: 'introduction',
        content: 'Halo Kak [Username], salam kenal dari tim Affiliate SJ Kitchen! Kami suka banget sama konten kuliner Kakak. Kami saat ini sedang mencari partner creator untuk campaign produk terbaru kami dengan komisi menarik + free product. Apakah Kakak tertarik untuk kolaborasi? Terima kasih!'
      },
      {
        name: 'Template Follow Up (WhatsApp)',
        type: 'follow-up',
        content: 'Halo Kak [Username]! Menindaklanjuti tawaran kolaborasi kemarin, apakah Kakak tertarik mencoba free product dari SJ Kitchen? Kabari ya Kak jika ada waktu senggang. Have a nice day!'
      },
      {
        name: 'Template Perkenalan (Tiktok)',
        type: 'introduction',
        content: 'Hii kak! Aku Selly dari SJ Kitchen\n\nLagi buka slot affiliate buat creator food/daily vlog — ada commission-nya!\n\nBuat yang join, kita kirim free sample Tempe Tabur dulu supaya kakak bisa nyobain sendiri sebelum konten.\nKalau tertarik, boleh lanjut di sini atau chat WA kita ya kak 😊\n\nhttps://wa.me/628111319997'
      },
      {
        name: 'Template Follow Up (Tiktok)',
        type: 'follow-up',
        content: 'Hii kak! Aku Selly dari SJ Kitchen\n\nLagi buka slot affiliate buat creator food/daily vlog — ada commission-nya!\n\nBuat yang join, kita kirim free sample Tempe Tabur dulu supaya kakak bisa nyobain sendiri sebelum konten.\nKalau tertarik, boleh lanjut di sini atau chat WA kita ya kak 😊\n\nhttps://wa.me/628111319997'
      },
      {
        name: 'Template Reminder Kirim Video',
        type: 'reminder',
        content: 'Halo Kak [Username]! Semoga sehat selalu. Sekadar mengingatkan untuk postingan video review SJ Kitchen sesuai kesepakatan target tanggal [Deadline]. Jika produk sudah siap atau ada kendala, kabari kami ya Kak. Terima kasih banyak!'
      },
      {
        name: 'Template Re-Approach (Campaign Baru)',
        type: 're-approach',
        content: 'Halo Kak [Username]! Kami senang sekali dengan performa video Kakak di campaign sebelumnya. Bulan ini kami ada campaign baru dengan menu spesial SJ Kitchen. Apakah Kakak bersedia untuk kolaborasi kembali dengan komisi spesial? Ditunggu kabarnya Kak!'
      },
      {
        name: 'Template Konfirmasi Deal & Alamat',
        type: 'deal',
        content: 'Hi Kak [Username]! Wah, senangnya bisa kolaborasi! Untuk pengiriman free product SJ Kitchen, boleh minta tolong kirimkan Nama Lengkap, Nomor HP aktif, dan Alamat Lengkap pengirimannya ya Kak. Terima kasih banyak!'
      },
      {
        name: 'Template Thank You & Fee Payment',
        type: 'thank-you',
        content: 'Halo Kak [Username]! Postingan video Kakak keren banget dan dapet respon bagus. Terlampir bukti transfer fee untuk kolaborasi ini ya Kak. Terima kasih banyak atas kerjasamanya yang luar biasa. Ditunggu kolaborasi selanjutnya!'
      }
    ]
  })

  console.log('Seeding Users...')
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash('sjkitchen123', salt)

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@sjkitchen.com',
      name: 'Executive Admin',
      passwordHash,
      role: Role.ADMIN
    }
  })

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@sjkitchen.com',
      name: 'Affiliate Manager',
      passwordHash,
      role: Role.MANAGER
    }
  })

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@sjkitchen.com',
      name: 'Affiliate Staff PIC',
      passwordHash,
      role: Role.STAFF
    }
  })

  const usersList = [adminUser, managerUser, staffUser]

  console.log('Seeding Campaigns...')
  const campaignMei = await prisma.campaign.create({
    data: {
      name: 'Mei Activation SV',
      status: CampaignStatus.COMPLETED,
      budget: 15000000,
      targetCreator: 50,
      targetVideo: 150,
      targetLive: 0
    }
  })

  const campaignJuni = await prisma.campaign.create({
    data: {
      name: 'June SV & Live Campaign',
      status: CampaignStatus.ACTIVE,
      budget: 25000000,
      targetCreator: 80,
      targetVideo: 240,
      targetLive: 80
    }
  })

  const campaignJuli = await prisma.campaign.create({
    data: {
      name: 'July Mega Launch Campaign',
      status: CampaignStatus.UPCOMING,
      budget: 50000000,
      targetCreator: 120,
      targetVideo: 360,
      targetLive: 120
    }
  })

  const campaignsList = [campaignMei, campaignJuni, campaignJuli]

  // Reading the excel file
  const excelPath = '/Users/harihartosurya/Downloads/Affiliate SJK-MOTODW.xlsx'
  if (!fs.existsSync(excelPath)) {
    console.error(`Excel file not found at ${excelPath}. Cannot seed affiliates from Excel. Seeding mock affiliates instead...`)
    return
  }

  console.log('Reading Excel data...')
  const workbook = XLSX.readFile(excelPath)
  const sheet = workbook.Sheets['Listing Creator']
  if (!sheet) {
    console.error("Sheet 'Listing Creator' not found in workbook.")
    return
  }

  // Convert sheet to JSON rows
  // Since row 1 is 'Collaboration Details' and row 2 has the actual column headers,
  // we start reading headers from row 2 (which is index 1).
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { range: 1 })
  console.log(`Found ${rawRows.length} rows in Listing Creator sheet. Importing into database...`)

  let affiliatesCreatedCount = 0
  const batchSize = 100
  let affiliateDataBatch: any[] = []

  // Track unique usernames to prevent duplicate database constraints
  const uniqueUsernames = new Set<string>()

  for (const row of rawRows) {
    const username = String(row['Username'] || '').trim().replace(/^@/, '')
    if (!username || username === 'None' || username === 'undefined' || uniqueUsernames.has(username)) {
      continue
    }
    uniqueUsernames.add(username)

    const listingDate = parseIndonesianDate(row['Listing Date'])
    const niche = row['Niche'] ? String(row['Niche']).trim() : 'Food & Beverages'
    const profileLink = row['Profile Link'] ? String(row['Profile Link']).trim() : `https://www.tiktok.com/@${username}`
    const waContact = row['WA Contact'] ? String(row['WA Contact']).trim() : null
    const rawFollowers = row['Followers'] ? String(row['Followers']).trim() : null
    const followersCount = parseFollowers(rawFollowers)
    const rawGmv = row['GMV L30D\nALL'] || row['GMV L30D'] || row['GMV'] ? String(row['GMV L30D\nALL'] || row['GMV L30D'] || row['GMV']).trim() : null
    const gmvCount = parseGMV(rawGmv)
    const period = row['Period'] ? String(row['Period']).trim() : null
    const activation = row['Activation'] ? String(row['Activation']).trim() : null
    const curate = row['Curate'] ? String(row['Curate']).trim() : null
    const contactConfirmation = row['Contact Confirmation'] ? String(row['Contact Confirmation']).trim() : null
    const affiliateConfirmation = row['Affiliate Confirmation'] ? String(row['Affiliate Confirmation']).trim() : null
    const remarks = row['Remarks'] ? String(row['Remarks']).trim() : null

    // Determine status
    let status = 'Belum Dihubungi'
    if (contactConfirmation) {
      const confLower = contactConfirmation.toLowerCase()
      if (confLower.includes('wa') || confLower.includes('dm') || confLower.includes('contacted')) {
        status = 'Sudah Dihubungi'
      }
    }

    if (affiliateConfirmation) {
      const affLower = affiliateConfirmation.toLowerCase()
      if (affLower.includes('approved') || affLower.includes('agree') || affLower.includes('deal')) {
        status = 'Deal'
      } else if (affLower.includes('reject')) {
        status = 'Reject'
      } else if (affLower.includes('no response') || affLower.includes('not response') || affLower.includes('ignore')) {
        status = 'Menunggu Balasan'
      } else if (affLower.includes('pending')) {
        status = 'Menunggu Deal'
      }
    }

    // Map some rows to other progress states to populate the kanban pipeline
    if (status === 'Sudah Dihubungi') {
      const r = Math.random()
      if (r < 0.2) status = 'Menunggu Balasan'
      else if (r < 0.4) status = 'Sudah Dibalas'
      else if (r < 0.6) status = 'Follow Up 1'
      else if (r < 0.8) status = 'Follow Up 2'
    } else if (status === 'Deal') {
      const r = Math.random()
      if (r < 0.3) status = 'Negotiation'
      else if (r < 0.5) status = 'Menunggu Deal'
      else if (r < 0.7) status = 'Campaign Berjalan'
      else if (r < 0.85) status = 'Campaign Selesai'
      else if (r < 0.95) status = 'Repeat Affiliate'
    }

    // Set priority
    let priority: Priority = Priority.MEDIUM
    if (followersCount > 100000 || gmvCount > 200000000) {
      priority = Priority.HIGH
    } else if (followersCount < 10000) {
      priority = Priority.LOW
    }

    // Assign PIC randomly
    const pic = usersList[Math.floor(Math.random() * usersList.length)]
    
    // Assign Campaign based on period or randomly
    let campaignId = null
    if (period) {
      if (period.toLowerCase().includes('mei')) campaignId = campaignMei.id
      else if (period.toLowerCase().includes('jun')) campaignId = campaignJuni.id
      else if (period.toLowerCase().includes('jul')) campaignId = campaignJuli.id
    }
    if (!campaignId) {
      campaignId = campaignsList[Math.floor(Math.random() * campaignsList.length)].id
    }

    affiliateDataBatch.push({
      listingDate,
      username,
      name: username.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      niche,
      profileLink,
      waContact: waContact || (Math.random() < 0.6 ? '+62812' + Math.floor(10000000 + Math.random() * 90000000) : null),
      followers: rawFollowers || `${(followersCount / 1000).toFixed(1)}rb`,
      followersCount,
      gmv: rawGmv || `${(gmvCount / 1000000).toFixed(1)}jt`,
      gmvCount,
      period,
      activation,
      curate,
      contactConfirmation,
      affiliateConfirmation,
      remarks,
      status,
      priority,
      picId: pic.id,
      campaignId,
      source: Math.random() < 0.7 ? 'TikTok Search' : 'IG Recommendation',
      email: Math.random() < 0.4 ? `${username}@gmail.com` : null,
      instagram: Math.random() < 0.5 ? `@${username}` : null
    })

    if (affiliateDataBatch.length >= batchSize) {
      await prisma.affiliate.createMany({ data: affiliateDataBatch })
      affiliatesCreatedCount += affiliateDataBatch.length
      affiliateDataBatch = []
    }
  }

  if (affiliateDataBatch.length > 0) {
    await prisma.affiliate.createMany({ data: affiliateDataBatch })
    affiliatesCreatedCount += affiliateDataBatch.length
  }

  console.log(`Seeded ${affiliatesCreatedCount} Affiliates successfully!`)

  // Retrieve some seeded affiliates to create deals, activities, and tasks
  const seededAffiliates = await prisma.affiliate.findMany({
    take: 300,
    orderBy: { createdAt: 'desc' }
  })

  console.log('Seeding Deals, Tasks, Activities, and Timeline...')
  
  const dealProducts = ['SJ Kitchen Sambal Bawang Pack', 'SJ Kitchen Bebek Madura Siap Saji', 'SJ Kitchen Bumbu Rendang Instan', 'SJ Kitchen Dendeng Balado Sapi']
  
  for (const affiliate of seededAffiliates) {
    const randomUser = usersList[Math.floor(Math.random() * usersList.length)]
    
    // 1. Seed Status History & Activity Timeline
    await prisma.activity.create({
      data: {
        affiliateId: affiliate.id,
        userId: randomUser.id,
        action: 'STATUS_CHANGE',
        details: `Imported from Excel template and set status to '${affiliate.status}'`
      }
    })

    if (affiliate.status !== 'Belum Dihubungi') {
      await prisma.statusHistory.create({
        data: {
          affiliateId: affiliate.id,
          oldStatus: 'Belum Dihubungi',
          newStatus: affiliate.status,
          changedAt: affiliate.listingDate || new Date()
        }
      })
      
      // Seed Contact History
      await prisma.contactHistory.create({
        data: {
          affiliateId: affiliate.id,
          picId: randomUser.id,
          contactDate: affiliate.listingDate || new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          channel: affiliate.profileLink?.includes('tiktok') ? 'WhatsApp' : 'TikTok DM',
          status: 'Responded',
          notes: 'Creator contacted via WhatsApp. Agree to join the affiliate program.'
        }
      })
    }

    // 2. Seed Deals for "Deal", "Campaign Berjalan", "Campaign Selesai", or "Repeat Affiliate" status
    const dealStatuses = ['Deal', 'Campaign Berjalan', 'Campaign Selesai', 'Repeat Affiliate']
    if (dealStatuses.includes(affiliate.status)) {
      const gmvVal = affiliate.gmvCount || 50000000
      const nominal = gmvVal * 0.1 // 10% commission
      
      let progressCampaign: ProgressCampaignStatus = ProgressCampaignStatus.NOT_STARTED
      if (affiliate.status === 'Campaign Berjalan') {
        const progressStages = [
          ProgressCampaignStatus.PRODUCT_SENT,
          ProgressCampaignStatus.CREATOR_RECEIVED,
          ProgressCampaignStatus.VIDEO_RECORDING,
          ProgressCampaignStatus.VIDEO_UPLOADED,
          ProgressCampaignStatus.LIVE_SCHEDULED
        ]
        progressCampaign = progressStages[Math.floor(Math.random() * progressStages.length)]
      } else if (affiliate.status === 'Campaign Selesai' || affiliate.status === 'Repeat Affiliate') {
        progressCampaign = ProgressCampaignStatus.COMPLETED
      }

      await prisma.deal.create({
        data: {
          affiliateId: affiliate.id,
          campaignId: affiliate.campaignId || campaignJuni.id,
          nominal,
          product: dealProducts[Math.floor(Math.random() * dealProducts.length)],
          picId: affiliate.picId,
          statusCampaign: progressCampaign.toString().replace('_', ' '),
          targetVideo: Math.random() < 0.7 ? 1 : 2,
          targetLive: Math.random() < 0.2 ? 1 : 0,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          completionRate: progressCampaign === ProgressCampaignStatus.COMPLETED ? 100.0 : Math.floor(Math.random() * 80),
          progressCampaign,
          dealDate: affiliate.listingDate || new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      })

      // Add a victory activity log
      await prisma.activity.create({
        data: {
          affiliateId: affiliate.id,
          userId: affiliate.picId,
          action: 'DEAL_WON',
          details: `Closed Won Deal with ${affiliate.name} (PIC: ${randomUser.name})`
        }
      })
    }

    // 3. Seed Tasks and Reminders
    if (affiliate.status === 'Sudah Dihubungi' || affiliate.status === 'Follow Up 1' || affiliate.status === 'Follow Up 2') {
      // Urgent follow up task
      await prisma.task.create({
        data: {
          title: `Follow Up ${affiliate.name}`,
          description: `Creator is contacted but has not responded yet. Follow up again via WhatsApp.`,
          dueDate: new Date(Date.now() + Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000), // in 0-2 days
          completed: false,
          affiliateId: affiliate.id,
          assignedToId: affiliate.picId,
          createdById: adminUser.id
        }
      })
    }
  }

  // 4. Seed some general system notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: staffUser.id,
        title: 'Follow Up Hari Ini',
        message: 'Kamu memiliki 12 affiliate yang perlu di-follow up hari ini.',
        read: false,
        type: 'follow-up'
      },
      {
        userId: staffUser.id,
        title: 'Re-Approach Creator',
        message: '8 affiliate perlu di-approach kembali bulan ini untuk campaign baru.',
        read: false,
        type: 'follow-up'
      },
      {
        userId: managerUser.id,
        title: 'Deadline Campaign Mendekat',
        message: 'Campaign "June SV & Live Campaign" akan berakhir dalam 5 hari.',
        read: false,
        type: 'campaign-deadline'
      }
    ]
  })

  console.log('Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
