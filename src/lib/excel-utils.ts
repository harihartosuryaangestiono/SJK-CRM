import * as XLSX from 'xlsx'
import { Priority } from '@prisma/client'

// Helper to parse Indonesian month names and formats into actual Date objects
export function parseIndonesianDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  
  const str = String(val).trim().toLowerCase()
  
  // Try default date parser first
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed

  // Parse custom format "1, Mei 2026"
  const indonesianMonths: Record<string, number> = {
    'jan': 0, 'januari': 0,
    'feb': 1, 'februari': 1,
    'mar': 2, 'maret': 2,
    'apr': 3, 'april': 3,
    'mei': 4, 'may': 4,
    'jun': 5, 'juni': 5,
    'jul': 6, 'juli': 6,
    'agu': 7, 'agustus': 7, 'aug': 7,
    'sep': 8, 'september': 8,
    'okt': 9, 'oktober': 9, 'oct': 9,
    'nov': 10, 'november': 10,
    'des': 11, 'desember': 11, 'dec': 11
  }

  // Regex matches: [day], [month] [year] or variations
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

// Convert followers strings like "8,5rb", "36,4rb", "1,2M" or "20k" to integers
export function parseFollowers(val: any): number {
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

// Convert GMV strings like "357,5jt", "272,8jt", "83,5jt" to floats
export function parseGMV(val: any): number {
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

// Map the Excel sheet data from the custom template columns to DB fields
export function parseExcelRowToAffiliate(row: any) {
  // Expected Columns mapping from Row 2 of sheet "Listing Creator":
  // 'Listing Date', 'Username', 'Niche', 'Duplicate', 'Profile Link', 'WA Contact', 'Followers', 'GMV L30D\nALL', 'Period', 'Activation', 'Contact Confirmation', 'Affiliate Confirmation', 'Remarks'
  
  const listingDate = parseIndonesianDate(row['Listing Date'])
  const username = String(row['Username'] || '').trim().replace(/^@/, '')
  const niche = row['Niche'] ? String(row['Niche']).trim() : null
  const profileLink = row['Profile Link'] ? String(row['Profile Link']).trim() : `https://www.tiktok.com/@${username}`
  const waContact = row['WA Contact'] ? String(row['WA Contact']).trim() : null
  const rawFollowers = row['Followers'] ? String(row['Followers']).trim() : null
  const followersCount = parseFollowers(rawFollowers)
  const rawGmv = row['GMV L30D\nALL'] || row['GMV L30D'] || row['GMV'] ? String(row['GMV L30D\nALL'] || row['GMV L30D'] || row['GMV']).trim() : null
  const gmvCount = parseGMV(rawGmv)
  const period = row['Period'] ? String(row['Period']).trim() : null
  const activation = row['Activation'] ? String(row['Activation']).trim() : null
  const rawCurate = row['Curate'] || row['Kurasi'] ? String(row['Curate'] || row['Kurasi']).trim() : null
  const contactConfirmation = row['Contact Confirmation'] ? String(row['Contact Confirmation']).trim() : null
  const affiliateConfirmation = row['Affiliate Confirmation'] ? String(row['Affiliate Confirmation']).trim() : null
  const remarks = row['Remarks'] ? String(row['Remarks']).trim() : null

  // Map Affiliate Confirmation to our Kanban CRM status
  // Common values: 'Approved', 'Reject', 'Not Response', 'Pending'
  // Legacy 'Menunggu Balasan' maps to 'Sudah Dihubungi'
  let crmStatus = 'Belum Dihubungi'
  if (contactConfirmation) {
    if (contactConfirmation.toLowerCase().includes('contacted wa')) {
      crmStatus = 'Sudah Dihubungi'
    } else if (contactConfirmation.toLowerCase().includes('contacted dm')) {
      crmStatus = 'Sudah Dihubungi'
    }
  }

  if (affiliateConfirmation) {
    const confirmationLower = affiliateConfirmation.toLowerCase()
    if (confirmationLower.includes('approved') || confirmationLower.includes('agree')) {
      crmStatus = 'Deal'
    } else if (confirmationLower.includes('reject')) {
      crmStatus = 'Reject'
    } else if (confirmationLower.includes('not response') || confirmationLower.includes('no response') || confirmationLower.includes('ghosting')) {
      crmStatus = 'Sudah Dihubungi'
    } else if (confirmationLower.includes('pending')) {
      crmStatus = 'Belum Dihubungi'
    }
  }

  const rawStatus = row['Status'] ? String(row['Status']).trim() : null
  if (rawStatus) {
    crmStatus = rawStatus === 'Menunggu Balasan' ? 'Sudah Dihubungi' : rawStatus
  }

  const curated = rawCurate
    ? ['sudah', 'yes', 'true', '1', 'sudah dikurasi', 'sudahdikurasi'].includes(rawCurate.toLowerCase())
    : false

  // Set priority based on GMV and followers
  let priority: Priority = Priority.MEDIUM
  if (followersCount > 100000 || gmvCount > 200000000) {
    priority = Priority.HIGH
  } else if (followersCount < 10000) {
    priority = Priority.LOW
  }

  return {
    listingDate,
    username,
    name: username, // default name to username
    niche,
    profileLink,
    waContact,
    followers: rawFollowers,
    followersCount,
    gmv: rawGmv,
    gmvCount,
    period,
    activation,
    curated,
    contactConfirmation,
    affiliateConfirmation,
    remarks,
    status: crmStatus,
    priority,
  }
}

// Generate Excel file from DB data
export function exportToExcel(data: any[]): Buffer {
  // We want to reconstruct the exact format of the "Listing Creator" sheet
  // Row 1: Merged header 'Collaboration Details'
  // Row 2: Columns list
  
  const headers = [
    'Listing Date', 'Username', 'Niche', 'Duplicate', 'Profile Link', 
    'WA Contact', 'Followers', 'GMV L30D\nALL', 'Period', 'Activation', 
    'Contact Confirmation', 'Affiliate Confirmation', 'Remarks'
  ]

  // Re-format data rows
  const rows = data.map((item, idx) => {
    // Reconstruct date format e.g. "1, Mei 2026"
    let dateStr = ''
    if (item.listingDate) {
      const d = new Date(item.listingDate)
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      dateStr = `${d.getDate()}, ${months[d.getMonth()]} ${d.getFullYear()}`
    }

    return {
      'Listing Date': dateStr,
      'Username': item.username,
      'Niche': item.niche || '',
      'Duplicate': `=COUNTIF(B:B, B${idx + 3})`, // Row 1 is header, Row 2 is column labels, data starts at row 3
      'Profile Link': `=CONCATENATE("https://www.tiktok.com/@", B${idx + 3})`,
      'WA Contact': item.waContact || '',
      'Followers': item.followers || '0',
      'GMV L30D\nALL': item.gmv || '0',
      'Period': item.period || '',
      'Activation': item.activation || '',
      'Contact Confirmation': item.contactConfirmation || '',
      'Affiliate Confirmation': item.affiliateConfirmation || '',
      'Remarks': item.remarks || ''
    }
  })

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  
  // Insert row 1 (custom category block starting at col index 10: "Contact Confirmation")
  XLSX.utils.sheet_add_aoa(ws, [
    [null, null, null, null, null, null, null, null, null, null, 'Collaboration Details']
  ], { origin: 'A1' })

  // Shift content down by 1 row to accommodate the top merged header
  const finalAoa = [
    [null, null, null, null, null, null, null, null, null, null, 'Collaboration Details'], // Row 1
    headers, // Row 2
    ...rows.map(r => headers.map(h => r[h as keyof typeof r])) // Data rows
  ]

  const finalWs = XLSX.utils.aoa_to_sheet(finalAoa)
  
  // Merge "Collaboration Details" columns (from Contact Confirmation (K) to Remarks (M)) - col index 10 to 12
  if (!finalWs['!merges']) finalWs['!merges'] = []
  finalWs['!merges'].push({ s: { r: 0, c: 10 }, e: { r: 0, c: 12 } })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, finalWs, 'Listing Creator')

  // Generate buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
