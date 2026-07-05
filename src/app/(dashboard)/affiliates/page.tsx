'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  UserCheck,
  Tag as TagIcon,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  X,
  FileSpreadsheet,
  AlertCircle,
  MoreHorizontal,
  Copy,
  Phone,
  MessageCircle,
  StickyNote
} from 'lucide-react'

// All progress statuses and their associated color schemes
const STATUS_OPTIONS = [
  'Belum Dihubungi', 'Sudah Dihubungi', 'Menunggu Balasan',
  'Follow Up 1', 'Follow Up 2', 'No Response', 'Negotiation',
  'Deal', 'Reject', 'Blacklist'
]

const STATUS_COLORS: Record<string, string> = {
  'Belum Dihubungi': 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  'Sudah Dihubungi': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30',
  'Menunggu Balasan': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30',
  'Follow Up 1': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30',
  'Follow Up 2': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30',
  'No Response': 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/30',
  'Negotiation': 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30',
  'Deal': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30',
  'Reject': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30',
  'Blacklist': 'bg-zinc-950/20 text-zinc-950 border-zinc-900/10 dark:bg-zinc-900 dark:text-red-400 dark:border-red-950'
}

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Terbaru Ditambahkan' },
  { value: 'listingDate-desc', label: 'Listing Date (Newest → Oldest)' },
  { value: 'listingDate-asc', label: 'Listing Date (Oldest → Newest)' },
  { value: 'username-asc', label: 'Username (A-Z)' },
  { value: 'username-desc', label: 'Username (Z-A)' },
  { value: 'followersCount-desc', label: 'Followers (High → Low)' },
  { value: 'followersCount-asc', label: 'Followers (Low → High)' },
  { value: 'gmvCount-desc', label: 'GMV (High → Low)' },
  { value: 'gmvCount-asc', label: 'GMV (Low → High)' },
  { value: 'status-asc', label: 'Status' },
  { value: 'pic-asc', label: 'PIC' },
  { value: 'campaign-asc', label: 'Campaign' },
  { value: 'lastContactDate-desc', label: 'Last Contact' },
  { value: 'lastFollowUpDate-desc', label: 'Last Follow Up' },
  { value: 'updatedAt-desc', label: 'Last Updated' },
]

interface Affiliate {
  id: string
  listingDate: string | null
  username: string
  name: string | null
  niche: string | null
  profileLink: string | null
  waContact: string | null
  followers: string | null
  followersCount: number
  gmv: string | null
  gmvCount: number
  period: string | null
  activation: string | null
  curate: string | null
  contactConfirmation: string | null
  affiliateConfirmation: string | null
  remarks: string | null
  status: string
  priority: string
  pic: { name: string } | null
  campaign: { name: string } | null
}

export default function AffiliateListingPage() {
  // Database states
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [pics, setPics] = useState<Array<{ id: string; name: string }>>([])
  
  // Table control states
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Search and Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [picFilter, setPicFilter] = useState('all')
  const [followersRange, setFollowersRange] = useState('all')
  const [gmvRange, setGmvRange] = useState('all')
  const [nicheFilter, setNicheFilter] = useState('all')

  // Modals state
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null)
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null)
  const [inlineNoteAffiliateId, setInlineNoteAffiliateId] = useState<string | null>(null)
  const [inlineNoteText, setInlineNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual Form State
  const [username, setFormUsername] = useState('')
  const [formProfileLink, setFormProfileLink] = useState('')
  const [formFollowers, setFormFollowers] = useState('')
  const [formGmv, setFormGmv] = useState('')
  const [formWa, setFormWa] = useState('')
  const [formCampaign, setFormCampaign] = useState('')
  const [formPic, setFormPic] = useState('')
  const [formStatus, setFormStatus] = useState('Belum Dihubungi')
  const [formRemarks, setFormRemarks] = useState('')
  const [formError, setFormError] = useState('')
  const [isBlacklistedWarning, setIsBlacklistedWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      setIsBlacklistedWarning(null)
      return
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${username}`)
        const json = await res.json()
        if (json.success && json.data) {
          const matched = json.data.find((c: any) => c.username.toLowerCase() === username.toLowerCase())
          if (matched && matched.status === 'Blacklist') {
            setIsBlacklistedWarning(`⚠️ PERINGATAN: Creator @${username} berada di daftar BLACKLIST. Alasan: ${matched.blacklistReason || '-'}`)
          } else {
            setIsBlacklistedWarning(null)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [username])

  // Fetch lists
  const fetchFilterLists = async () => {
    try {
      const [campRes, picRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/users')
      ])
      if (campRes.ok) {
        const json = await campRes.json()
        setCampaigns(json.data || [])
      }
      if (picRes.ok) {
        const json = await picRes.json()
        setPics(json.data || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAffiliates = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        page: String(page),
        limit: '25',
        search,
        status: statusFilter,
        campaignId: campaignFilter,
        picId: picFilter,
        followersRange,
        gmvRange,
        niche: nicheFilter,
        sortBy,
        sortOrder
      })
      const res = await fetch(`/api/affiliates?${query}`)
      if (res.ok) {
        const json = await res.json()
        setAffiliates(json.data || [])
        setTotalPages(json.pagination.totalPages || 1)
        setTotalRecords(json.pagination.total || 0)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Refetch when search/filter/page/sort parameters change
  useEffect(() => {
    fetchAffiliates()
  }, [page, statusFilter, campaignFilter, picFilter, followersRange, gmvRange, nicheFilter, sortBy, sortOrder])

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1)
      fetchAffiliates()
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [search])

  useEffect(() => {
    fetchFilterLists()
  }, [])

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(affiliates.map(a => a.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} creator terpilih?`)) {
      try {
        const res = await fetch(`/api/affiliates?ids=${selectedIds.join(',')}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          alert('Berhasil menghapus data creator.')
          setSelectedIds([])
          fetchAffiliates()
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleBulkChangeStatus = async (status: string) => {
    if (!status) return
    try {
      const res = await fetch('/api/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'change-status', value: status })
      })
      if (res.ok) {
        alert('Berhasil memperbarui status creator.')
        setSelectedIds([])
        fetchAffiliates()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleBulkAssignPic = async (picId: string) => {
    if (!picId) return
    try {
      const res = await fetch('/api/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'assign-pic', value: picId })
      })
      if (res.ok) {
        alert('Berhasil mengubah PIC.')
        setSelectedIds([])
        fetchAffiliates()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleBulkMoveCampaign = async (campaignId: string) => {
    if (!campaignId) return
    try {
      const res = await fetch('/api/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'move-campaign', value: campaignId })
      })
      if (res.ok) {
        alert('Berhasil memindahkan campaign.')
        setSelectedIds([])
        fetchAffiliates()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleInlineStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        toast.success(`Status diperbarui: ${newStatus}`)
        fetchAffiliates()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Gagal memperbarui status')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.')
    }
  }

  const handleInlinePicChange = async (id: string, picId: string) => {
    try {
      const res = await fetch(`/api/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picId })
      })
      if (res.ok) {
        toast.success('PIC berhasil diperbarui!')
        fetchAffiliates()
      } else {
        toast.error('Gagal memperbarui PIC.')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.')
    }
  }

  const handleAddInlineNote = async () => {
    if (!inlineNoteText.trim() || !inlineNoteAffiliateId) return
    try {
      setSavingNote(true)
      const res = await fetch(`/api/affiliates/${inlineNoteAffiliateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inlineNoteText })
      })
      if (res.ok) {
        toast.success('Catatan berhasil ditambahkan!')
        setInlineNoteAffiliateId(null)
        setInlineNoteText('')
      } else {
        toast.error('Gagal menambahkan catatan.')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleBulkOpenWhatsApp = () => {
    const selectAffs = affiliates.filter(a => selectedIds.includes(a.id) && a.waContact)
    if (selectAffs.length === 0) {
      toast.error('Tidak ada creator terpilih dengan nomor WA valid.')
      return
    }
    const first = selectAffs[0]
    const cleanNumber = first.waContact!.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanNumber}`, '_blank')
    toast.success(`WhatsApp dibuka untuk @${first.username}. Sisa: ${selectAffs.length - 1}`)
    setSelectedIds(prev => prev.filter(id => id !== first.id))
  }

  // Duplicate preview state
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [resolutions, setResolutions] = useState<Record<number, 'MERGE' | 'REPLACE' | 'SKIP' | 'CREATE_NEW'>>({})
  const [showDuplicateScreen, setShowDuplicateScreen] = useState(false)

  // File Import handler
  const handleImportFile = async (e: React.FormEvent) => {
    e.preventDefault()
    setImportError('')
    setImportSuccess('')
    
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setImportError('Silakan pilih file Excel (.xlsx atau .csv) terlebih dahulu.')
      toast.error('Silakan pilih file Excel (.xlsx atau .csv) terlebih dahulu.')
      return
    }

    setImporting(true)
    const reader = new FileReader()
    
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        // Convert sheet to array of arrays first to inspect header positions dynamically
        const allRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
        
        let headerRowIndex = 0
        for (let i = 0; i < Math.min(allRows.length, 5); i++) {
          const row = allRows[i]
          if (Array.isArray(row)) {
            const hasUsername = row.some(cell => 
              String(cell || '').toLowerCase().includes('username') || 
              String(cell || '').toLowerCase().includes('creator') || 
              String(cell || '').toLowerCase().includes('listing date')
            )
            if (hasUsername) {
              headerRowIndex = i
              break
            }
          }
        }
        
        const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex })
        
        if (rawData.length === 0) {
          throw new Error('File Excel kosong atau format tidak sesuai.')
        }

        // Map column names to standard keys with robust case/spacing normalization
        const mappedRows = rawData.map((row) => {
          const normalizedRow: Record<string, any> = {}
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
            normalizedRow[normalizedKey] = row[key]
          })

          const getVal = (patterns: string[]) => {
            for (const p of patterns) {
              if (normalizedRow[p] !== undefined) return normalizedRow[p]
            }
            return null
          }

          const username = String(getVal(['username', 'tiktokcreator', 'creator']) || '').trim().replace(/^@/, '')

          return {
            username,
            name: getVal(['name', 'nama']) || null,
            niche: getVal(['niche', 'kategori', 'categoryniche']) || 'Food & Beverages',
            profileLink: getVal(['profilelink', 'tiktokurl', 'url']) || null,
            waContact: getVal(['wacontact', 'whatsapp', 'wa', 'nomorwa']) || null,
            followers: String(getVal(['followers', 'pengikut', 'jumlahfollowers']) || ''),
            gmv: String(getVal(['gmvl30dall', 'gmvl30d', 'gmv']) || ''),
            period: getVal(['period', 'periode']) || null,
            activation: getVal(['activation', 'aktivasi']) || null,
            curate: getVal(['curate', 'kurasi']) || null,
            contactConfirmation: getVal(['contactconfirmation', 'konfirmasikontak']) || null,
            affiliateConfirmation: getVal(['affiliateconfirmation', 'konfirmasiaffiliate']) || null,
            remarks: getVal(['remarks', 'catatan', 'keterangan']) || null,
            email: getVal(['email', 'surel']) || null,
            instagram: getVal(['instagram', 'ig']) || null,
            status: getVal(['status', 'tahap']) || 'Belum Dihubungi'
          }
        }).filter(r => r.username && r.username !== 'None' && r.username !== 'undefined' && r.username !== '')

        if (mappedRows.length === 0) {
          throw new Error('Tidak ada data creator/username valid yang ditemukan dalam file.')
        }

        setParsedRows(mappedRows)

        // Check duplicates against server
        const dupRes = await fetch('/api/affiliates/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: mappedRows })
        })
        const dupData = await dupRes.json()

        if (dupData.success && dupData.duplicates.length > 0) {
          setDuplicates(dupData.duplicates)
          
          // Initialise resolutions to default MERGE for existing duplicates
          const initialResolutions: Record<number, 'MERGE' | 'REPLACE' | 'SKIP' | 'CREATE_NEW'> = {}
          dupData.duplicates.forEach((dup: any) => {
            initialResolutions[dup.index] = 'MERGE'
          })
          setResolutions(initialResolutions)
          setShowDuplicateScreen(true)
          toast.warning(`Terdeteksi ${dupData.duplicates.length} data duplikat. Silakan tentukan resolusi.`)
        } else {
          // Direct insert if zero duplicates
          const finalData = mappedRows.map((row, idx) => ({
            action: 'CREATE_NEW',
            incoming: row
          }))
          
          const saveRes = await fetch('/api/affiliates/import-resolved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resolutions: finalData })
          })
          const saveData = await saveRes.json()
          if (saveData.success) {
            setImportSuccess(saveData.message)
            toast.success('File excel berhasil diimpor!')
            setTimeout(() => {
              setShowImportModal(false)
              setImportSuccess('')
              fetchAffiliates()
            }, 2000)
          } else {
            throw new Error(saveData.error || saveData.message || 'Gagal mengimpor file.')
          }
        }
      } catch (err: any) {
        setImportError(err.message || 'Gagal membaca atau memproses file.')
        toast.error(err.message || 'Gagal membaca atau memproses file.')
      } finally {
        setImporting(false)
      }
    }

    reader.onerror = () => {
      setImportError('Gagal membaca file.')
      toast.error('Gagal membaca file.')
      setImporting(false)
    }

    reader.readAsArrayBuffer(file)
  }

  const handleResolvedImportSubmit = async () => {
    try {
      setImporting(true)
      setImportError('')
      
      const finalResolutions = parsedRows.map((row, idx) => {
        const action = resolutions[idx] || 'CREATE_NEW'
        const existing = duplicates.find(d => d.index === idx)?.existing
        return {
          action,
          incoming: row,
          existingId: existing?.id
        }
      })

      const res = await fetch('/api/affiliates/import-resolved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutions: finalResolutions })
      })
      const data = await res.json()

      if (data.success) {
        setImportSuccess(data.message)
        toast.success('Impor data duplikat terselesaikan!')
        setTimeout(() => {
          setShowImportModal(false)
          setShowDuplicateScreen(false)
          setImportSuccess('')
          setDuplicates([])
          setParsedRows([])
          fetchAffiliates()
        }, 2000)
      } else {
        throw new Error(data.error || data.message || 'Gagal mengimpor file.')
      }
    } catch (err: any) {
      setImportError(err.message)
      toast.error(err.message || 'Gagal menyimpan resolusi konflik.')
    } finally {
      setImporting(false)
    }
  }

  // Manual Creation form submission
  const handleAddCreatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!username) {
      setFormError('Username TikTok wajib diisi')
      return
    }

    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          name: username, // Fallback name to username
          niche: 'Food & Beverages', // Default niche
          followers: formFollowers || '0',
          gmv: formGmv || '0',
          waContact: formWa,
          profileLink: formProfileLink,
          campaignId: formCampaign || null,
          picId: formPic || null,
          status: formStatus,
          remarks: formRemarks,
        })
      })

      const data = await res.json()
      if (res.ok) {
        setShowAddModal(false)
        // Reset form
        setFormUsername('')
        setFormProfileLink('')
        setFormFollowers('')
        setFormGmv('')
        setFormWa('')
        setFormRemarks('')
        fetchAffiliates()
      } else {
        throw new Error(data.message || 'Gagal menambahkan creator.')
      }
    } catch (err: any) {
      setFormError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Affiliate Database</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Kelola seluruh listing creator affiliate secara realtime ({totalRecords} records)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Export button */}
          <a
            href="/api/affiliates/import-export"
            download
            className="flex items-center gap-1.5 bg-white dark:bg-[#2C2C2E] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </a>
          
          {/* Import button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-white dark:bg-[#2C2C2E] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Excel
          </button>

          {/* Create Manual button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#007AFF] hover:bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            Tambah Creator
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Quick Search & Filters trigger on Mobile */}
          <div className="flex gap-2 w-full md:w-auto flex-1">
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 pointer-events-none">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Cari Username TikTok, Nama, WhatsApp, atau remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-full text-xs placeholder-[#6E6E73] dark:placeholder-[#8E8E93] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] text-[#1D1D1F] dark:text-white transition-all shadow-2xs"
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="md:hidden flex items-center gap-1 bg-white dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 text-zinc-600 dark:text-zinc-350 px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5 text-[#007AFF]" />
              Filter
            </button>
          </div>

          {/* Quick Filters - Desktop only */}
          <div className="hidden md:flex flex-wrap gap-2">
            {/* Sort Select */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}
              className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-full px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#007AFF] hover:border-zinc-300 dark:hover:border-zinc-750 cursor-pointer transition-colors shadow-2xs"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>⇅ {opt.label}</option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-full px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#007AFF] hover:border-zinc-300 dark:hover:border-zinc-750 cursor-pointer transition-colors shadow-2xs"
            >
              <option value="all">Semua Status</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {/* Campaign Select */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-full px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#007AFF] hover:border-zinc-300 dark:hover:border-zinc-750 cursor-pointer transition-colors shadow-2xs"
            >
              <option value="all">Semua Campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* PIC Select */}
            <select
              value={picFilter}
              onChange={(e) => setPicFilter(e.target.value)}
              className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-full px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#007AFF] hover:border-zinc-300 dark:hover:border-zinc-750 cursor-pointer transition-colors shadow-2xs"
            >
              <option value="all">Semua PIC</option>
              {pics.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary filters line - Desktop only */}
        <div className="hidden md:flex flex-wrap gap-2.5 pt-3 border-t border-[#E5E5EA] dark:border-[#38383A]/60">
          <div className="flex items-center gap-1.5 text-[#6E6E73] dark:text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider mr-2">
            <Filter className="h-3 w-3" />
            Filter Lanjutan:
          </div>

          {/* Followers Select */}
          <select
            value={followersRange}
            onChange={(e) => setFollowersRange(e.target.value)}
            className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#6E6E73] dark:text-[#8E8E93] hover:border-zinc-300 rounded-full px-3 py-1.5 text-[11px] font-medium focus:outline-none cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all">Pengikut: Semua</option>
            <option value="under-10k">&lt; 10k Followers</option>
            <option value="10k-50k">10k - 50k Followers</option>
            <option value="50k-100k">50k - 100k Followers</option>
            <option value="over-100k">&gt; 100k Followers</option>
          </select>

          {/* GMV Select */}
          <select
            value={gmvRange}
            onChange={(e) => setGmvRange(e.target.value)}
            className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#6E6E73] dark:text-[#8E8E93] hover:border-zinc-300 rounded-full px-3 py-1.5 text-[11px] font-medium focus:outline-none cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all">GMV L30D: Semua</option>
            <option value="under-10jt">&lt; 10jt GMV</option>
            <option value="10jt-50jt">10jt - 50jt GMV</option>
            <option value="50jt-200jt">50jt - 200jt GMV</option>
            <option value="over-200jt">&gt; 200jt GMV</option>
          </select>

          {/* Niche select */}
          <select
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#6E6E73] dark:text-[#8E8E93] hover:border-zinc-300 rounded-full px-3 py-1.5 text-[11px] font-medium focus:outline-none cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all">Niche: Semua</option>
            <option value="Food & Beverages">Food & Beverages</option>
            <option value="Beauty & Personal Care">Beauty & Personal Care</option>
            <option value="Fashion & Apparel">Fashion & Apparel</option>
            <option value="Home & Kitchen">Home & Kitchen</option>
          </select>
        </div>
      </div>

      {/* Mobile Filters Bottom Sheet Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 backdrop-blur-sm md:hidden">
          <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 w-full rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Filter className="h-4.5 w-4.5 text-accent" />
                Filter Creator Database
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="text-zinc-450 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-1"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
              {/* Sort Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Urutkan Berdasarkan</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field)
                    setSortOrder(order)
                  }}
                  className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium w-full focus:outline-none"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Status Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Status CRM</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium w-full focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Campaign Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Campaign</label>
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium w-full focus:outline-none"
                >
                  <option value="all">Semua Campaign</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* PIC Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">PIC In Charge</label>
                <select
                  value={picFilter}
                  onChange={(e) => setPicFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium w-full focus:outline-none"
                >
                  <option value="all">Semua PIC</option>
                  {pics.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Followers Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Jumlah Followers</label>
                <select
                  value={followersRange}
                  onChange={(e) => setFollowersRange(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium w-full focus:outline-none"
                >
                  <option value="all">Semua Jumlah</option>
                  <option value="under-10k">&lt; 10k Followers</option>
                  <option value="10k-50k">10k - 50k Followers</option>
                  <option value="50k-100k">50k - 100k Followers</option>
                  <option value="over-100k">&gt; 100k Followers</option>
                </select>
              </div>

              {/* GMV Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">GMV L30D</label>
                <select
                  value={gmvRange}
                  onChange={(e) => setGmvRange(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium w-full focus:outline-none"
                >
                  <option value="all">Semua GMV</option>
                  <option value="under-10jt">&lt; 10jt GMV</option>
                  <option value="10jt-50jt">10jt - 50jt GMV</option>
                  <option value="50jt-200jt">50jt - 200jt GMV</option>
                  <option value="over-200jt">&gt; 200jt GMV</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowMobileFilters(false)}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Panel (sticky overlay at bottom if active) */}
      {selectedIds.length > 0 && (
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-bold text-zinc-200">
              {selectedIds.length} creator dipilih untuk Mass-Action
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Change Status */}
            <select
              onChange={(e) => handleBulkChangeStatus(e.target.value)}
              value=""
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-950 text-zinc-300">Ubah Status...</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{opt}</option>
              ))}
            </select>

            {/* Assign PIC */}
            <select
              onChange={(e) => handleBulkAssignPic(e.target.value)}
              value=""
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-950 text-zinc-300">Assign PIC...</option>
              {pics.map(p => (
                <option key={p.id} value={p.id} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{p.name}</option>
              ))}
            </select>

            {/* Move Campaign */}
            <select
              onChange={(e) => handleBulkMoveCampaign(e.target.value)}
              value=""
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-950 text-zinc-300">Pindahkan Campaign...</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{c.name}</option>
              ))}
            </select>

            {/* Delete selected */}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 text-[11px] bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-400 font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Massal
            </button>

            {/* Cancel selection */}
            <button
              onClick={() => setSelectedIds([])}
              className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bulk Action Bar - appears when rows are selected */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-3 bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700 dark:border-zinc-200 backdrop-blur-sm animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-zinc-600 dark:border-zinc-300">
            <div className="h-5 w-5 rounded-full bg-[#007AFF] flex items-center justify-center text-[10px] font-bold text-white">{selectedIds.length}</div>
            <span className="text-xs font-semibold">dipilih</span>
          </div>
          {/* Bulk WhatsApp */}
          <button
            onClick={handleBulkOpenWhatsApp}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer px-2"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </button>
          {/* Bulk Assign PIC */}
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { handleBulkAssignPic(e.target.value) } }}
            className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-zinc-300 dark:text-zinc-700 hover:text-white dark:hover:text-black"
          >
            <option value="" disabled className="bg-zinc-950 text-zinc-300">Assign PIC</option>
            {pics.map(p => (<option key={p.id} value={p.id} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{p.name}</option>))}
          </select>
          {/* Bulk Change Status */}
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { handleBulkChangeStatus(e.target.value) } }}
            className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-zinc-300 dark:text-zinc-700 hover:text-white dark:hover:text-black"
          >
            <option value="" disabled className="bg-zinc-950 text-zinc-300">Ubah Status</option>
            {STATUS_OPTIONS.map(opt => (<option key={opt} value={opt} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{opt}</option>))}
          </select>
          {/* Bulk Export */}
          <a
            href={`/api/affiliates/import-export?ids=${selectedIds.join(',')}`}
            download
            className="flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] hover:text-blue-400 transition-colors cursor-pointer px-2"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </a>
          <div className="border-l border-zinc-600 dark:border-zinc-300 pl-3">
            {/* Bulk Delete */}
            <button
              onClick={() => handleBulkDelete()}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
          {/* Dismiss */}
          <button onClick={() => setSelectedIds([])} className="ml-2 text-zinc-500 dark:text-zinc-400 hover:text-white dark:hover:text-black transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Table view - Desktop only */}
      <div className="hidden md:block bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 bg-[#F5F5F7] dark:bg-[#1E1E1E]/40 text-[#6E6E73] dark:text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider select-none">
                <th className="py-4 px-4 w-[40px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === affiliates.length && affiliates.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-zinc-900 text-[#007AFF] focus:ring-[#007AFF]/35"
                  />
                </th>
                <th className="py-4 px-4">Listing Date</th>
                <th className="py-4 px-4">TikTok Creator</th>
                <th className="py-4 px-4">Category Niche</th>
                <th className="py-4 px-4">Followers</th>
                <th className="py-4 px-4">GMV L30D</th>
                <th className="py-4 px-4">AI Priority</th>
                <th className="py-4 px-4">Campaign</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">PIC In Charge</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]/60 text-xs">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-3.5 w-3.5 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-16 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-28 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-24 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-14 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-14 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-16 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-20 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-5 w-24 bg-zinc-150 dark:bg-zinc-800 rounded-full" /></td>
                    <td className="py-4 px-4"><div className="h-3.5 w-20 bg-zinc-150 dark:bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-14 bg-zinc-150 dark:bg-zinc-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : affiliates.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center select-none">
                    <div className="max-w-[280px] mx-auto space-y-4">
                      <div className="h-12 w-12 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] flex items-center justify-center mx-auto text-[#6E6E73] dark:text-[#8E8E93]">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white">No Affiliate Found</h3>
                        <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] leading-normal">
                          Belum ada data creator atau tidak ada record yang cocok dengan filter pencarian Anda.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mx-auto flex items-center gap-1.5 bg-[#007AFF] text-white px-4 py-2 rounded-full text-[10px] font-bold transition-all hover:bg-blue-600 cursor-pointer shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        Add Affiliate
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                affiliates.map((item) => {
                  // Calculate dynamic AI priority stars
                  let stars = 1
                  let priorityLabel = 'LOW'
                  let priorityColor = 'text-zinc-450 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/80 dark:border-zinc-800'
                  
                  const fCount = item.followersCount || 0
                  const gCount = item.gmvCount || 0
                  
                  if (fCount >= 100000 || gCount >= 150000000) {
                    stars = 5
                    priorityLabel = 'HIGH'
                    priorityColor = 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                  } else if (fCount >= 50000 && gCount >= 50000000) {
                    stars = 4
                    priorityLabel = 'HIGH'
                    priorityColor = 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                  } else if (fCount >= 50000 || gCount >= 50000000) {
                    stars = 4
                    priorityLabel = 'MEDIUM'
                    priorityColor = 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
                  } else if (fCount >= 15000 || gCount >= 15000000) {
                    stars = 3
                    priorityLabel = 'MEDIUM'
                    priorityColor = 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
                  } else if (fCount >= 5000 || gCount >= 5000000) {
                    stars = 2
                    priorityLabel = 'MEDIUM'
                    priorityColor = 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
                  }

                  return (
                    <tr key={item.id} className="hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/30 border-b border-[#E5E5EA] dark:border-[#38383A]/60 last:border-0 transition-colors">
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="rounded border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-zinc-900 text-[#007AFF] focus:ring-[#007AFF]/35"
                        />
                      </td>
                      <td className="py-4 px-4 text-[#6E6E73] dark:text-[#8E8E93]">
                        {item.listingDate
                          ? new Date(item.listingDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td className="py-4 px-4 font-semibold text-[#1D1D1F] dark:text-white">
                        <div className="flex items-center gap-1">
                          <Link href={`/affiliates/${item.id}`} className="hover:text-[#007AFF] transition-colors font-mono">
                            @{item.username}
                          </Link>
                          <a
                            href={item.profileLink || `https://www.tiktok.com/@${item.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white p-0.5 rounded"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#6E6E73] dark:text-[#8E8E93]">{item.niche || 'Food & Beverages'}</td>
                      <td className="py-4 px-4">
                        <span className="bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#1D1D1F] dark:text-white shadow-2xs">
                          {item.followers || '0'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#34C759] shadow-2xs">
                          {item.gmv || '0'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border w-max ${priorityColor} shadow-2xs`}>
                            {priorityLabel}
                          </span>
                          <span className="text-[9px] text-[#FF9F0A] font-serif">
                            {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#6E6E73] dark:text-[#8E8E93]">{item.campaign?.name || '-'}</td>
                      {/* Quick Inline Status Badge */}
                      <td className="py-4 px-4">
                        <div className="relative">
                          <button
                            onClick={() => setActiveStatusDropdownId(activeStatusDropdownId === item.id ? null : item.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[item.status] || 'bg-zinc-800 text-zinc-300 border-zinc-700'} shadow-2xs`}
                          >
                            {item.status}
                          </button>
                          {activeStatusDropdownId === item.id && (
                            <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl shadow-lg p-1 min-w-[200px] max-h-64 overflow-y-auto">
                              <p className="px-3 pt-1.5 pb-1 text-[9px] font-bold text-[#6E6E73] uppercase tracking-wider">Ubah Status</p>
                              {STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    handleInlineStatusChange(item.id, opt)
                                    setActiveStatusDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#6E6E73] dark:text-[#8E8E93]">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-[#6E6E73] dark:text-[#8E8E93]" />
                          </div>
                          <span className="truncate max-w-[120px]">{item.pic?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      {/* Quick Actions Cell */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/affiliates/${item.id}`}
                            className="bg-white dark:bg-[#2C2C2E] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-xs font-bold text-[#007AFF] px-3.5 py-1.5 rounded-full active:scale-[0.98] transition-all inline-block shadow-2xs"
                          >
                            Detail
                          </Link>
                          <div className="relative">
                            <button
                              onClick={() => setActiveActionDropdownId(activeActionDropdownId === item.id ? null : item.id)}
                              className="h-7 w-7 flex items-center justify-center bg-white dark:bg-[#2C2C2E] hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-[#E5E5EA] dark:border-[#38383A] rounded-full text-[#6E6E73] dark:text-[#8E8E93] transition-all shadow-2xs cursor-pointer"
                              title="Quick Actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                            {activeActionDropdownId === item.id && (
                              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl shadow-xl p-1 min-w-[190px]">
                                <p className="px-3 pt-1.5 pb-1 text-[9px] font-bold text-[#6E6E73] uppercase tracking-wider">Quick Actions</p>
                                {/* Copy Username */}
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`@${item.username}`)
                                    toast.success('Username di-copy!')
                                    setActiveActionDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2"
                                >
                                  <Copy className="h-3 w-3 shrink-0" />
                                  Copy Username
                                </button>
                                {/* Copy WA */}
                                {item.waContact && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.waContact!)
                                      toast.success('Nomor WA di-copy!')
                                      setActiveActionDropdownId(null)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <Phone className="h-3 w-3 shrink-0" />
                                    Copy Nomor WA
                                  </button>
                                )}
                                {/* Open WhatsApp */}
                                {item.waContact && (
                                  <button
                                    onClick={() => {
                                      const cleaned = item.waContact!.replace(/[^0-9]/g, '')
                                      window.open(`https://wa.me/${cleaned}`, '_blank')
                                      setActiveActionDropdownId(null)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <MessageCircle className="h-3 w-3 shrink-0" />
                                    Buka WhatsApp
                                  </button>
                                )}
                                <div className="border-t border-[#E5E5EA] dark:border-[#38383A] my-1" />
                                {/* Add Note */}
                                <button
                                  onClick={() => {
                                    setInlineNoteAffiliateId(item.id)
                                    setInlineNoteText('')
                                    setActiveActionDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2"
                                >
                                  <StickyNote className="h-3 w-3 shrink-0" />
                                  Tambah Catatan
                                </button>
                                {/* Assign PIC */}
                                <div className="px-3 py-1.5">
                                  <p className="text-[9px] font-bold text-[#6E6E73] mb-1">Assign PIC</p>
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleInlinePicChange(item.id, e.target.value)
                                        setActiveActionDropdownId(null)
                                      }
                                    }}
                                    className="w-full text-[10px] bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Pilih PIC...</option>
                                    {pics.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Inline Note Input */}
                        {inlineNoteAffiliateId === item.id && (
                          <div className="mt-2 flex gap-1.5 items-center">
                            <input
                              type="text"
                              autoFocus
                              value={inlineNoteText}
                              onChange={(e) => setInlineNoteText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddInlineNote() }}
                              placeholder="Tulis catatan..."
                              className="flex-1 text-[10px] bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#007AFF] text-[#1D1D1F] dark:text-white"
                            />
                            <button onClick={handleAddInlineNote} disabled={savingNote} className="text-[10px] bg-[#007AFF] text-white px-2.5 py-1.5 rounded-lg font-bold cursor-pointer hover:bg-blue-600 transition-all disabled:opacity-50">
                              {savingNote ? '...' : 'Simpan'}
                            </button>
                            <button onClick={() => setInlineNoteAffiliateId(null)} className="text-[10px] text-[#6E6E73] px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                              Batal
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Listing */}
      <div className="block md:hidden space-y-4 mb-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              </div>
              <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="flex gap-2">
                <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))
        ) : affiliates.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-8 text-center text-zinc-500 font-medium">
            Tidak ada creator yang ditemukan.
          </div>
        ) : (
          affiliates.map((item) => {
            // Calculate dynamic AI priority stars
            let stars = 1
            let priorityLabel = 'LOW'
            let priorityColor = 'text-zinc-450 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/80 dark:border-zinc-800'
            const fCount = item.followersCount || 0
            const gCount = item.gmvCount || 0
            
            if (fCount >= 100000 || gCount >= 150000000) {
              stars = 5
              priorityLabel = 'HIGH'
              priorityColor = 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30'
            } else if (fCount >= 50000 && gCount >= 50000000) {
              stars = 4
              priorityLabel = 'HIGH'
              priorityColor = 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30'
            } else if (fCount >= 50000 || gCount >= 50000000) {
              stars = 4
              priorityLabel = 'MEDIUM'
              priorityColor = 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
            } else if (fCount >= 15000 || gCount >= 15000000) {
              stars = 3
              priorityLabel = 'MEDIUM'
              priorityColor = 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
            } else if (fCount >= 5000 || gCount >= 5000000) {
              stars = 2
              priorityLabel = 'MEDIUM'
              priorityColor = 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
            }

            return (
              <div key={item.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-4 space-y-3 relative shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                      className="rounded border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-accent"
                    />
                    <Link href={`/affiliates/${item.id}`} className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-accent font-mono text-sm">
                      @{item.username}
                    </Link>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLORS[item.status] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Niche: {item.niche || 'Food & Beverages'}</p>

                <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-2 text-[10px] text-zinc-450 dark:text-zinc-500">
                  <div>
                    <span className="block font-medium">Followers</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{item.followers || '0'}</span>
                  </div>
                  <div>
                    <span className="block font-medium">GMV L30D</span>
                    <span className="font-bold text-emerald-650 dark:text-emerald-400">{item.gmv || '0'}</span>
                  </div>
                  <div>
                    <span className="block font-medium">Priority</span>
                    <span className="text-amber-500 font-serif font-bold">{'★'.repeat(stars)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-900 text-[10px] text-zinc-450 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-zinc-400" />
                    {item.pic?.name || 'Unassigned'}
                  </span>
                  <Link href={`/affiliates/${item.id}`} className="text-accent hover:underline font-bold">
                    Detail Profil →
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination bar */}
      {!loading && totalRecords > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20 px-6 py-4 rounded-b-2xl">
          <span className="text-xs text-zinc-500 font-semibold">
            Menampilkan {affiliates.length} dari {totalRecords} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 active:scale-[0.96] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-zinc-750 dark:text-zinc-350 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-lg">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 active:scale-[0.96] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: IMPORT EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${
            showDuplicateScreen ? 'w-full max-w-4xl' : 'w-full max-w-[500px]'
          }`}>
            <div className="flex items-center justify-between border-b border-zinc-850 p-4">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-400" />
                {showDuplicateScreen ? 'Resolusi Duplikasi Data Excel' : 'Import Affiliate Database'}
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setShowDuplicateScreen(false)
                  setDuplicates([])
                  setSelectedFileName('')
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            {showDuplicateScreen ? (
              <div className="p-5 space-y-4">
                <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3 text-xs text-amber-400 leading-relaxed">
                  <strong>Terdeteksi {duplicates.length} data duplikat!</strong> Tentukan tindakan penyelesaian untuk masing-masing baris konflik di bawah. Baris lain yang unik akan langsung didaftarkan sebagai data baru.
                </div>

                {importError && (
                  <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-400 font-medium">
                    {importError}
                  </div>
                )}
                {importSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-400 font-medium">
                    {importSuccess}
                  </div>
                )}

                {/* Duplicate Grid */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto bg-zinc-950/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                        <th className="p-3">Data Baris Excel</th>
                        <th className="p-3">Kecocokan Database (Konflik)</th>
                        <th className="p-3">Penyebab Konflik</th>
                        <th className="p-3 text-right">Tindakan Resolusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicates.map((dup) => {
                        const idx = dup.index
                        const incoming = dup.incoming
                        const existing = dup.existing
                        const currentRes = resolutions[idx] || 'MERGE'

                        return (
                          <tr key={idx} className="border-b border-zinc-850/60 hover:bg-zinc-900/10">
                            <td className="p-3 space-y-0.5">
                              <span className="font-bold text-zinc-200 font-mono">@{incoming.username}</span>
                              <div className="text-[10px] text-zinc-400">{incoming.name || '-'} • WA: {incoming.waContact || '-'}</div>
                            </td>
                            <td className="p-3 space-y-0.5">
                              <span className="font-bold text-zinc-400 font-mono">@{existing.username}</span>
                              <div className="text-[10px] text-zinc-500">
                                {existing.name || '-'} • 
                                {existing.status === 'Blacklist' ? (
                                  <span className="text-red-400 font-bold bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded ml-1">
                                    Status: BLACKLISTED ⚠️
                                  </span>
                                ) : (
                                  <span>Status: {existing.status}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/20 text-red-400 border border-red-900/30">
                                {dup.reasons.join(', ')}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <select
                                value={currentRes}
                                onChange={(e) => {
                                  setResolutions(prev => ({
                                    ...prev,
                                    [idx]: e.target.value as any
                                  }))
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="MERGE">Merge (Gabungkan)</option>
                                <option value="REPLACE">Replace (Ganti)</option>
                                <option value="SKIP">Skip (Abaikan)</option>
                                <option value="CREATE_NEW">Create New (Buat Baru Suffix)</option>
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateScreen(false)
                      setDuplicates([])
                    }}
                    className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleResolvedImportSubmit}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {importing ? (
                      <div className="h-3.5 w-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Konfirmasi & Mulai Impor'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImportFile} className="p-5 space-y-4">
                {importError && (
                  <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-400 font-medium">
                    {importError}
                  </div>
                )}
                {importSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-400 font-medium">
                    {importSuccess}
                  </div>
                )}

                <div className="border-2 border-dashed border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 text-center hover:border-zinc-300 dark:hover:border-zinc-700 transition-all relative min-h-[140px] flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/10">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      setSelectedFileName(file ? file.name : '')
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {selectedFileName ? (
                    <div className="space-y-2 z-20">
                      <FileSpreadsheet className="h-10 w-10 text-[#007AFF] mx-auto mb-1" />
                      <p className="text-xs font-bold text-[#1D1D1F] dark:text-white truncate max-w-[320px]">{selectedFileName}</p>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          setSelectedFileName('');
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-600 mt-2 bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-full border border-red-500/10 cursor-pointer active:scale-95 transition-all"
                      >
                        Hapus File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pointer-events-none">
                      <FileSpreadsheet className="h-10 w-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white">Pilih File Excel / CSV</p>
                      <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Dukung format .xlsx, .xls, atau .csv</p>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3 text-[10px] text-zinc-500 leading-relaxed space-y-1">
                  <p className="font-bold text-zinc-400">PENTING:</p>
                  <p>Format kolom harus persis dengan template Excel:</p>
                  <code className="text-emerald-400/90 font-mono block mt-1">
                    Listing Date, Username, Niche, Profile Link, WA Contact, Followers, GMV L30D, Period, Activation, Curate
                  </code>
                </div>

                <button
                  type="submit"
                  disabled={importing}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2 px-4 rounded-xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {importing ? (
                    <div className="h-3.5 w-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Mulai Impor Data
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}


      {/* MODAL 2: TAMBAH CREATOR MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[620px] overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-850 p-4">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-emerald-400" />
                Tambah Creator Manual
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCreatorSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {formError}
                </div>
              )}

              {isBlacklistedWarning && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-400 font-bold animate-pulse">
                  {isBlacklistedWarning}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Username TikTok *</label>
                  <input
                    type="text"
                    required
                    placeholder="safieranulizza"
                    value={username}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 text-zinc-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">TikTok Link</label>
                  <input
                    type="text"
                    placeholder="https://tiktok.com/@safieranulizza"
                    value={formProfileLink}
                    onChange={(e) => setFormProfileLink(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">No WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+628123456789"
                    value={formWa}
                    onChange={(e) => setFormWa(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Followers (raw)</label>
                  <input
                    type="text"
                    placeholder="8,5rb"
                    value={formFollowers}
                    onChange={(e) => setFormFollowers(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">GMV L30D (raw)</label>
                  <input
                    type="text"
                    placeholder="357,5jt"
                    value={formGmv}
                    onChange={(e) => setFormGmv(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Assign PIC</label>
                  <select
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="">Pilih PIC...</option>
                    {pics.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Campaign</label>
                  <select
                    value={formCampaign}
                    onChange={(e) => setFormCampaign(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="">Pilih Campaign...</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Catatan / Notes</label>
                <textarea
                  placeholder="Catatan pengerjaan atau komisi..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 text-zinc-100"
                />
              </div>

              <div className="pt-2 border-t border-zinc-850 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-750 text-zinc-300 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-zinc-950 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Simpan Creator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
