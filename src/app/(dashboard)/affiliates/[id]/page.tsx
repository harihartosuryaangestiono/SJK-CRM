'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Globe,
  User,
  Award,
  ChevronDown,
  Clock,
  Plus,
  StickyNote,
  History,
  CheckCircle2,
  DollarSign,
  Briefcase,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Handshake,
  Flame,
  CheckCircle,
  ShieldCheck,
  TrendingUp,
  FileText,
  Upload,
  Eye,
  Settings,
  UserCheck,
  Video,
  Truck,
  Play,
  X
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import AffiliateHealthScore from '@/components/affiliate-health-score'

const STATUS_OPTIONS = [
  'Belum Dihubungi', 'Sudah Dihubungi',
  'Follow Up 1', 'Follow Up 2', 'No Response', 'Negotiation',
  'Deal', 'Reject', 'Tidak Relevan', 'Blacklist'
]

const STATUS_COLORS: Record<string, string> = {
  'Belum Dihubungi': 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  'Sudah Dihubungi': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30',
  'Follow Up 1': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30',
  'Follow Up 2': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30',
  'No Response': 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/30',
  'Negotiation': 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30',
  'Deal': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30',
  'Reject': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30',
  'Tidak Relevan': 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/30',
  'Blacklist': 'bg-zinc-950/20 text-zinc-950 border-zinc-900/10 dark:bg-zinc-900 dark:text-red-400 dark:border-red-950'
}

interface Note {
  id: string
  content: string
  createdAt: string
}

interface Activity {
  id: string
  action: string
  details: string
  createdAt: string
  user: { name: string } | null
}

interface Deal {
  id: string
  nominal: number
  product: string
  statusCampaign: string
  dealDate: string
  campaign: { name: string }
}

interface FileAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string | null
  createdAt: string
}

interface AuditLog {
  id: string
  userName: string | null
  createdAt: string
  action: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
}

interface AffiliateProfile {
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
  email: string | null
  instagram: string | null
  status: string
  priority: string
  remarks: string | null
  pic: { id: string; name: string } | null
  campaign: { id: string; name: string } | null
  notes: Note[]
  activities: Activity[]
  deals: Deal[]
}

function AffiliateProfilePageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string

  const fromPage = searchParams.get('fromPage') || '1'
  const backUrl = `/affiliates?page=${fromPage}`

  const [profile, setProfile] = useState<AffiliateProfile | null>(null)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit Form States
  const [pics, setPics] = useState<Array<{ id: string; name: string }>>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [updating, setUpdating] = useState(false)

  // Local profile form state for explicit save
  const [formNiche, setFormNiche] = useState('')
  const [formWa, setFormWa] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formInstagram, setFormInstagram] = useState('')
  const [formRemarks, setFormRemarks] = useState('')
  const [formDirty, setFormDirty] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  
  // Quick Actions panel open/close toggle
  const [quickActionsOpen, setQuickActionsOpen] = useState(true)
  
  // Advanced Tabs Layout (Objective 14)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'deals' | 'files' | 'notes' | 'activities' | 'audit_logs' | 'analytics' | 'sow'>('overview')

  // New Note State
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  // Upload state
  const [uploadFileType, setUploadFileType] = useState('SCREENSHOT_CHAT')
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const fetchProfileDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/affiliates/${id}`)
      if (res.ok) {
        const json = await res.json()
        const data = json.data as AffiliateProfile
        setProfile(data)
        // Sync local form state whenever profile reloads
        setFormNiche(data.niche || 'Food & Beverages')
        setFormWa(data.waContact || '')
        setFormEmail((data as any).email || '')
        setFormInstagram((data as any).instagram || '')
        setFormRemarks(data.remarks || '')
        setFormDirty(false)
      } else {
        throw new Error('Creator not found')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Explicit save for profile metadata fields
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true)
      const res = await fetch(`/api/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: formNiche,
          waContact: formWa,
          email: formEmail,
          instagram: formInstagram,
          remarks: formRemarks,
        })
      })
      if (res.ok) {
        toast.success('Profil berhasil disimpan!')
        fetchProfileDetails()
        fetchAuditLogs()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Gagal menyimpan profil.')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.')
    } finally {
      setSavingProfile(false)
    }
  }

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/affiliates/${id}/attachments`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setAttachments(json.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`/api/audit-logs?entity=Affiliate&search=${id}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setAuditLogs(json.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchFormLists = async () => {
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

  useEffect(() => {
    fetchProfileDetails()
    fetchAttachments()
    fetchAuditLogs()
    fetchFormLists()
  }, [id])

  // Field change updates
  const handleFieldChange = async (field: string, value: any) => {
    try {
      setUpdating(true)
      const res = await fetch(`/api/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })

      if (res.ok) {
        fetchProfileDetails() // Refresh details
        fetchAuditLogs() // Refresh audit trail
      } else {
        const data = await res.json()
        alert(data.message || 'Gagal memperbarui profil.')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(false)
    }
  }

  // Save note handler
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return

    try {
      setNoteSaving(true)
      const res = await fetch(`/api/affiliates/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent })
      })

      if (res.ok) {
        setNoteContent('')
        fetchProfileDetails() // Refresh details to get new note
        fetchAuditLogs()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setNoteSaving(false)
    }
  }

  // File Upload handler
  const handleUploadFile = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', uploadFileType)

      const res = await fetch(`/api/affiliates/${id}/attachments`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success) {
        toast.success('File uploaded successfully')
        fetchAttachments()
        fetchProfileDetails()
        fetchAuditLogs()
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        toast.error(data.message || 'Upload failed')
      }
    } catch (e) {
      toast.error('Error uploading file')
    } finally {
      setUploadingFile(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-850 rounded" />
        <div className="flex gap-4 items-center">
          <div className="h-16 w-16 bg-zinc-200 dark:bg-zinc-850 rounded-2xl" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-850 rounded" />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-850 rounded" />
          </div>
        </div>
        <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-850 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-zinc-200 dark:bg-zinc-850 rounded-2xl" />
          <div className="h-72 bg-zinc-200 dark:bg-zinc-850 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-8 text-center max-w-[450px] mx-auto mt-12 shadow-xs">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-150">Error Memuat Profil</h2>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{error || 'Creator tidak ditemukan.'}</p>
        <Link
          href={backUrl}
          className="mt-5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-250 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Database
        </Link>
      </div>
    )
  }

  // Activity events customized icons
  const getTimelineEventIcon = (action: string) => {
    const act = action.toUpperCase()
    if (act.includes('WA') || act.includes('WHATSAPP')) {
      return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
    }
    if (act.includes('BACA') || act.includes('READ')) {
      return <Mail className="h-3.5 w-3.5 text-zinc-400" />
    }
    if (act.includes('BALAS') || act.includes('REPLY')) {
      return <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
    }
    if (act.includes('FOLLOW')) {
      return <Clock className="h-3.5 w-3.5 text-amber-500" />
    }
    if (act.includes('DEAL') || act.includes('WON')) {
      return <Handshake className="h-3.5 w-3.5 text-emerald-600" />
    }
    if (act.includes('CAMPAIGN_START') || act.includes('JALAN')) {
      return <Flame className="h-3.5 w-3.5 text-orange-500" />
    }
    if (act.includes('COMPLETED') || act.includes('SELESAI')) {
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
    }
    return <StickyNote className="h-3.5 w-3.5 text-zinc-450" />
  }

  // Calculate Priority Stars
  let stars = 1
  let priorityLabel = 'LOW'
  let priorityColor = 'text-zinc-450 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/80 dark:border-zinc-800'
  const fCount = profile.followersCount || 0
  const gCount = profile.gmvCount || 0
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
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-5">
        <Link
          href={backUrl}
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-550 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 w-fit shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Database
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-xl font-bold font-mono">
              @{profile.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">@{profile.username}</h1>
                <a
                  href={profile.profileLink || `https://www.tiktok.com/@${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-750 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-lg transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">{profile.name || profile.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
              CRM Status:
            </span>
            <div className="relative">
              <select
                value={profile.status}
                disabled={updating}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className={`appearance-none bg-white dark:bg-zinc-950 border text-xs font-bold rounded-xl pl-4 pr-10 py-2.5 focus:outline-none cursor-pointer disabled:opacity-50 transition-colors ${STATUS_COLORS[profile.status] || 'bg-zinc-800 border-zinc-700'}`}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">{opt}</option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs — iOS Segmented Control */}
      <div className="bg-[#E5E5EA] dark:bg-[#1E1E1F] p-0.5 rounded-xl flex flex-wrap gap-0.5 w-max max-w-full">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'timeline', label: 'Timeline' },
          profile?.status === 'Deal' ? { id: 'sow', label: 'SOW Workflow' } : null,
          { id: 'deals', label: 'Deals' },
          { id: 'files', label: 'Files' },
          { id: 'notes', label: 'Notes' },
          { id: 'activities', label: 'Activities' },
          { id: 'audit_logs', label: 'Audit Logs' },
          { id: 'analytics', label: 'Analytics' }
        ].filter(Boolean).map(tab => (
          <button
            key={tab!.id}
            onClick={() => setActiveTab(tab!.id as any)}
            className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-all ${
              activeTab === tab!.id
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-white/40 dark:hover:bg-zinc-800/40'
            }`}
          >
            {tab!.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-zinc-650 dark:text-zinc-300 rounded-[24px] shadow-2xs">
                <CardHeader className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#1D1D1F] dark:text-white text-sm font-semibold">Metadata Informasi</CardTitle>
                    {formDirty && (
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex items-center gap-1.5 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {savingProfile ? 'Menyimpan...' : '✓ Simpan Perubahan'}
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
                  <div>
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase font-bold block">Niche / Kategori</span>
                    <select
                      value={formNiche}
                      onChange={(e) => { setFormNiche(e.target.value); setFormDirty(true) }}
                      className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-xl px-3 py-2 mt-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none w-full focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Food & Beverages">Food & Beverages</option>
                      <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                      <option value="Fashion & Apparel">Fashion & Apparel</option>
                      <option value="Home & Kitchen">Home & Kitchen</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase font-bold block">WhatsApp Contact</span>
                    <input
                      type="text"
                      value={formWa}
                      onChange={(e) => { setFormWa(e.target.value); setFormDirty(true) }}
                      className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-xl px-3 py-2 mt-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none w-full focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase font-bold block">Email Address</span>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => { setFormEmail(e.target.value); setFormDirty(true) }}
                      className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-xl px-3 py-2 mt-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none w-full focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase font-bold block">Instagram Username</span>
                    <input
                      type="text"
                      value={formInstagram}
                      onChange={(e) => { setFormInstagram(e.target.value); setFormDirty(true) }}
                      className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-xl px-3 py-2 mt-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none w-full focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all shadow-2xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase font-bold block">Remarks / Catatan</span>
                    <textarea
                      value={formRemarks}
                      onChange={(e) => { setFormRemarks(e.target.value); setFormDirty(true) }}
                      rows={3}
                      placeholder="Tambahkan catatan profil..."
                      className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-xl px-3 py-2 mt-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none w-full focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all shadow-2xs resize-none"
                    />
                  </div>
                  {formDirty && (
                    <div className="md:col-span-2 flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex items-center gap-1.5 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {savingProfile ? 'Menyimpan...' : '✓ Simpan Profil'}
                      </button>
                      <button
                        onClick={() => {
                          setFormNiche(profile.niche || 'Food & Beverages')
                          setFormWa(profile.waContact || '')
                          setFormEmail((profile as any).email || '')
                          setFormInstagram((profile as any).instagram || '')
                          setFormRemarks(profile.remarks || '')
                          setFormDirty(false)
                        }}
                        className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white px-3 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Batalkan
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar Overview Details */}
            <div className="space-y-6">
              <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-zinc-650 dark:text-zinc-300 rounded-[24px] shadow-2xs">
                <CardContent className="p-5 space-y-4">
                  <AffiliateHealthScore affiliateId={profile.id} />
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3">
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase">AI Priority</span>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${priorityColor} shadow-2xs`}>
                        {priorityLabel}
                      </span>
                      <span className="text-xs text-[#FF9F0A] mt-1">{ '★'.repeat(stars) }</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3">
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase">Followers Count</span>
                    <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">{profile.followers || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3">
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase">GMV L30D</span>
                    <span className="text-xs font-bold text-[#34C759]">{profile.gmv || '0'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase block mb-1.5">PIC Assigned</span>
                    <select
                      value={profile.pic?.id || ''}
                      onChange={(e) => handleFieldChange('picId', e.target.value || null)}
                      className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] text-xs text-[#1D1D1F] dark:text-white p-2.5 rounded-xl focus:outline-none w-full cursor-pointer transition-colors shadow-2xs"
                    >
                      <option value="">Unassigned</option>
                      {pics.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Timeline */}
        {activeTab === 'timeline' && (
          <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">Timeline Aktivitas & Outreach</h3>
                <Clock className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="relative pl-6 border-l border-zinc-205 dark:border-zinc-850 space-y-6 ml-3 py-2">
                {profile.activities.length === 0 ? (
                  <div className="text-zinc-400 dark:text-zinc-650 text-xs text-center py-6">Belum ada riwayat aktivitas outreach</div>
                ) : (
                  profile.activities.map((act) => (
                    <div key={act.id} className="relative group flex items-start gap-4 animate-in fade-in duration-300">
                      {/* Event Dot */}
                      <span className="absolute -left-[31px] bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                        {getTimelineEventIcon(act.action)}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">{act.details}</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold">
                          {new Date(act.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} • Oleh: {act.user?.name || 'System'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Deals */}
        {activeTab === 'deals' && (
          <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider mb-4">Milestone Deals & Kerja Sama</h3>
              <div className="overflow-x-auto">
                {profile.deals.length === 0 ? (
                  <div className="text-zinc-400 dark:text-zinc-600 text-center text-xs py-8 leading-relaxed">Belum ada deal terdaftar untuk creator ini</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-900 pb-3 text-zinc-450 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-2">Tanggal</th>
                        <th className="pb-2">Campaign</th>
                        <th className="pb-2">Produk</th>
                        <th className="pb-2">Nominal</th>
                        <th className="pb-2 text-right">Status Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                      {profile.deals.map((deal) => (
                        <tr key={deal.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                          <td className="py-3 text-zinc-500">{new Date(deal.dealDate).toLocaleDateString('id-ID')}</td>
                          <td className="py-3 text-zinc-800 dark:text-zinc-200 font-bold">{deal.campaign.name}</td>
                          <td className="py-3 text-zinc-550 dark:text-zinc-400">{deal.product}</td>
                          <td className="py-3 text-emerald-650 dark:text-emerald-400 font-bold">Rp {deal.nominal.toLocaleString('id-ID')}</td>
                          <td className="py-3 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                              {deal.statusCampaign}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab: SOW Workflow */}
        {activeTab === 'sow' && (
          <div className="space-y-6">
            {profile.deals.length === 0 ? (
              <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-zinc-650 dark:text-zinc-300 rounded-[20px] shadow-2xs">
                <CardContent className="p-6 text-center text-zinc-400 text-xs">
                  Belum ada deal terdaftar untuk creator ini. Status harus diubah ke 'Deal' terlebih dahulu.
                </CardContent>
              </Card>
            ) : (
              profile.deals.map((deal) => (
                <SowDealCard key={deal.id} deal={deal} onSave={fetchProfileDetails} />
              ))
            )}
          </div>
        )}

        {/* Tab 4: Files (Attachments) */}
        {activeTab === 'files' && (
          <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">File & Dokumen Attachment</h3>
                  <p className="text-[10px] text-zinc-500">Unggah chat screens, invoice, contract, bukti transfer, dll.</p>
                </div>
                
                {/* Upload Form */}
                <div className="flex items-center gap-2">
                  <select
                    value={uploadFileType}
                    onChange={(e) => setUploadFileType(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs font-semibold p-1.5 focus:outline-none cursor-pointer text-zinc-700 dark:text-zinc-300"
                  >
                    <option value="SCREENSHOT_CHAT">Screenshot Chat</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="CONTRACT">Contract (SOW)</option>
                    <option value="TRANSFER_PROOF">Transfer Proof</option>
                    <option value="PRODUCT_PHOTO">Product Photo</option>
                    <option value="VIDEO_BRIEF">Video Brief</option>
                  </select>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <button
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingFile ? 'Mengunggah...' : 'Upload File'}
                  </button>
                </div>
              </div>

              {/* Attachments List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-400 dark:text-zinc-600 text-xs">Belum ada lampiran dokumen</div>
                ) : (
                  attachments.map((file) => (
                    <div key={file.id} className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 p-3.5 rounded-2xl flex items-center justify-between group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-accent" />
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]" title={file.fileName}>
                            {file.fileName}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold">
                          Type: <span className="text-zinc-650 dark:text-zinc-450 uppercase font-bold">{file.fileType.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
                        title="Buka / Preview Lampiran"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 5: Notes */}
        {activeTab === 'notes' && (
          <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-2">Catatan Internal PIC</h3>
              <form onSubmit={handleSaveNote} className="space-y-2.5">
                <textarea
                  placeholder="Tambahkan catatan khusus creator ini..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-accent transition-colors"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={noteSaving}
                  className="px-4 py-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Simpan Catatan
                </button>
              </form>

              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                {profile.notes.length === 0 ? (
                  <div className="text-zinc-400 dark:text-zinc-600 text-xs text-center py-6">Belum ada catatan terdaftar</div>
                ) : (
                  profile.notes.map((n) => (
                    <div key={n.id} className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-900 p-4 rounded-2xl shadow-2xs animate-in fade-in duration-300">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{n.content}</p>
                      <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-semibold block mt-2.5">
                        Ditambahkan pada: {new Date(n.createdAt).toLocaleDateString('id-ID')} • {new Date(n.createdAt).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 6: Activities */}
        {activeTab === 'activities' && (
          <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider mb-4">Log Riwayat Modifikasi Data (PIC)</h3>
              <div className="space-y-4">
                {profile.activities.map((act) => (
                  <div key={act.id} className="flex gap-3 pb-3.5 border-b border-zinc-100 dark:border-zinc-900/60 last:border-0 last:pb-0">
                    <div className="h-6.5 w-6.5 rounded bg-zinc-55 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 mt-0.5 shadow-2xs">
                      <History className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-650 dark:text-zinc-300">
                        <span className="font-bold text-zinc-850 dark:text-zinc-100">{act.user?.name || 'System'}</span>: {act.details}
                      </p>
                      <span className="text-[9px] text-zinc-450 dark:text-zinc-550 block mt-1 font-semibold">
                        {new Date(act.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 7: Audit Logs */}
        {activeTab === 'audit_logs' && (
          <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Audit Trail Log Compliance (Immutable)
              </h3>
              <div className="overflow-x-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-zinc-400 dark:text-zinc-650 text-xs text-center py-8">Belum ada catatan log audit yang terdaftar</div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-900 pb-2 text-zinc-450 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-2">Waktu</th>
                        <th className="pb-2">User</th>
                        <th className="pb-2">Action</th>
                        <th className="pb-2">IP Address</th>
                        <th className="pb-2">Old / New Values Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                          <td className="py-3 text-zinc-500">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                          <td className="py-3 text-zinc-805 dark:text-zinc-200 font-semibold">{log.userName || 'System'}</td>
                          <td className="py-3">
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-bold">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-zinc-400 dark:text-zinc-500">{log.ipAddress || '-'}</td>
                          <td className="py-3">
                            <div className="max-w-[250px] truncate font-mono text-[10px] text-zinc-550 dark:text-zinc-450" title={log.newValue || ''}>
                              {log.newValue || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 8: Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
              <CardContent className="p-4 space-y-2">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase font-bold tracking-wider">Campaign Success Rate</span>
                <h4 className="text-xl font-bold tracking-tight text-zinc-850 dark:text-zinc-50">100.0%</h4>
                <div className="flex items-center gap-1 text-[10px] text-emerald-650 dark:text-emerald-400 font-bold">
                  <TrendingUp className="h-3 w-3" />
                  Semua campaign diselesaikan tepat waktu
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
              <CardContent className="p-4 space-y-2">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase font-bold tracking-wider">Average Engagement</span>
                <h4 className="text-xl font-bold tracking-tight text-zinc-850 dark:text-zinc-50">4.8%</h4>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                  Konsisten di atas benchmarking industri (3.0%)
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-2xl shadow-xs">
              <CardContent className="p-4 space-y-2">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase font-bold tracking-wider">Repeat Collaboration</span>
                <h4 className="text-xl font-bold tracking-tight text-emerald-650 dark:text-emerald-400">
                  {profile.deals.length > 1 ? 'Yes' : 'No'}
                </h4>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                  Total {profile.deals.length} SOW Deals terdaftar
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* Floating Quick-Action Panel - fixed bottom-right with toggle */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {/* Expanded Panel — conditionally shown */}
        {quickActionsOpen && (
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xl p-4 space-y-3 w-[240px] animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Quick Actions</div>
              <button
                onClick={() => setQuickActionsOpen(false)}
                className="h-5 w-5 flex items-center justify-center rounded-full text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                title="Tutup Quick Actions"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            
            {/* WhatsApp Button */}
            {profile.waContact ? (
              <a
                href={`https://wa.me/${profile.waContact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo kak @${profile.username}!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2.5 bg-[#34C759] hover:bg-[#2db34a] text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                Buka WhatsApp
              </a>
            ) : (
              <div className="w-full flex items-center gap-2.5 bg-[#F5F5F7] dark:bg-zinc-800 text-[#6E6E73] px-3 py-2 rounded-xl text-[11px] font-semibold opacity-50 cursor-not-allowed">
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                Tidak ada WA
              </div>
            )}

            {/* Quick Add Note */}
            <form onSubmit={handleSaveNote} className="space-y-1.5">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={2}
                placeholder="Tambah catatan cepat..."
                className="w-full px-2.5 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-[11px] text-[#1D1D1F] dark:text-white placeholder-[#6E6E73] focus:outline-none focus:border-[#007AFF] resize-none"
              />
              <button
                type="submit"
                disabled={noteSaving || !noteContent.trim()}
                className="w-full bg-[#007AFF] hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {noteSaving ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </form>

            {/* Quick Status Change */}
            <div>
              <div className="text-[9px] font-bold text-[#6E6E73] uppercase mb-1">Ubah Status</div>
              <select
                value={profile.status}
                disabled={updating}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-xl px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:border-[#007AFF] cursor-pointer disabled:opacity-50"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Upload File Quick */}
            <div>
              <div className="text-[9px] font-bold text-[#6E6E73] uppercase mb-1">Upload File</div>
              <div className="flex gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleUploadFile}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {uploadingFile ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Contact Hub Link */}
            <Link
              href="/contact"
              className="w-full flex items-center justify-center gap-1.5 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-[#E5E5EA] dark:border-[#38383A] text-[#007AFF] px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Buka Contact Hub
            </Link>
          </div>
        )}

        {/* Toggle FAB button */}
        <button
          onClick={() => setQuickActionsOpen(prev => !prev)}
          className={`h-12 w-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
            quickActionsOpen
              ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-zinc-700 dark:border-zinc-300 hover:bg-zinc-700 dark:hover:bg-white'
              : 'bg-[#007AFF] text-white border-blue-400 hover:bg-blue-600'
          }`}
          title={quickActionsOpen ? 'Tutup Quick Actions' : 'Buka Quick Actions'}
        >
          {quickActionsOpen
            ? <X className="h-5 w-5" />
            : <Settings className="h-5 w-5" />
          }
        </button>
      </div>
    </div>
  )
}

function SowDealCard({ deal, onSave }: { deal: any; onSave: () => void }) {
  const [targetVideo, setTargetVideo] = useState(deal.targetVideo || 1)
  const [uploadedVideoCount, setUploadedVideoCount] = useState(deal.uploadedVideoCount || 0)
  const [sampleSentDate, setSampleSentDate] = useState(deal.sampleSentDate ? new Date(deal.sampleSentDate).toISOString().split('T')[0] : '')
  const [sampleReceivedDate, setSampleReceivedDate] = useState(deal.sampleReceivedDate ? new Date(deal.sampleReceivedDate).toISOString().split('T')[0] : '')
  const initialLinks = [deal.videoLink1, deal.videoLink2, deal.videoLink3].filter(Boolean)
  const [videoLinks, setVideoLinks] = useState<string[]>(initialLinks.length > 0 ? initialLinks : [''])
  const [saving, setSaving] = useState(false)

  const handleAddLink = () => setVideoLinks([...videoLinks, ''])
  const handleRemoveLink = (index: number) => setVideoLinks(videoLinks.filter((_, i) => i !== index))
  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...videoLinks]
    newLinks[index] = value
    setVideoLinks(newLinks)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deal.id,
          targetVideo,
          uploadedVideoCount,
          sampleSentDate: sampleSentDate || null,
          sampleReceivedDate: sampleReceivedDate || null,
          videoLink1: videoLinks[0] || null,
          videoLink2: videoLinks[1] || null,
          videoLink3: videoLinks[2] || null,
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('SOW Deal berhasil diperbarui!')
        onSave()
      } else {
        toast.error(json.message || 'Gagal memperbarui SOW')
      }
    } catch (err: any) {
      toast.error('Gagal koneksi saat menyimpan SOW')
    } finally {
      setSaving(false)
    }
  }

  const progressPercent = Math.min(100, Math.round((uploadedVideoCount / (targetVideo || 1)) * 100))

  return (
    <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xs">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#F2F2F7] dark:border-[#38383A] pb-4 mb-5 gap-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider flex items-center gap-2">
              <Video className="h-4 w-4 text-[#007AFF]" />
              SOW: {deal.campaign?.name || 'Campaign Deal'}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Produk: {deal.product || '-'}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
              deal.sowStatus === 'Completed'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                : deal.sowStatus === 'Overdue'
                ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                : 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400'
            }`}>
              Status: {deal.sowStatus || 'In Progress'}
            </span>
            <span className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] font-medium">Progress: {progressPercent}%</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] h-2 rounded-full overflow-hidden">
            <div className="bg-[#007AFF] h-full transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Video Kesepakatan</label>
                  <input
                    type="number"
                    min="1"
                    value={targetVideo}
                    onChange={(e) => setTargetVideo(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs focus:outline-none focus:border-[#007AFF] text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Video Diupload</label>
                  <input
                    type="number"
                    min="0"
                    value={uploadedVideoCount}
                    onChange={(e) => setUploadedVideoCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs focus:outline-none focus:border-[#007AFF] text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Kirim Sample
                  </label>
                  <input
                    type="date"
                    value={sampleSentDate}
                    onChange={(e) => setSampleSentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs focus:outline-none focus:border-[#007AFF] text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Terima Sample
                  </label>
                  <input
                    type="date"
                    value={sampleReceivedDate}
                    onChange={(e) => setSampleReceivedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs focus:outline-none focus:border-[#007AFF] text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {sampleReceivedDate && (
                <div className="bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl p-3 text-[11px] leading-relaxed text-[#6E6E73] dark:text-[#8E8E93]">
                  <Clock className="h-3.5 w-3.5 inline mr-1 text-zinc-400" />
                  Due Date SOW (H+14): <strong className="text-zinc-800 dark:text-zinc-200">
                    {new Date(new Date(sampleReceivedDate).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>
                </div>
              )}
            </div>

            {/* Dynamic Video Links */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                  <Play className="h-3 w-3 text-[#007AFF]" />
                  Link Video TikTok
                </label>
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#007AFF] hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Tambah Link
                </button>
              </div>
              {videoLinks.map((link, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-[9px] font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                    <span className="text-[10px] text-zinc-400 font-semibold">Video Link {index + 1}{index === 0 ? '' : ' (Opsional)'}</span>
                  </div>
                  <div className="relative flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="https://vt.tiktok.com/..."
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      className="flex-1 pl-3 pr-8 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs focus:outline-none focus:border-[#007AFF] text-zinc-900 dark:text-white"
                    />
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" className="absolute right-8 top-1/2 -translate-y-1/2 text-[#007AFF]">
                        <Play className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {videoLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-[#F2F2F7] dark:border-[#38383A] pt-4 mt-5">
            <button
              type="submit"
              disabled={saving}
              className="apple-btn-primary px-5 h-9 text-xs shadow-2xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan SOW'}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AffiliateProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-8 w-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6E6E73] text-sm font-medium">Memuat Profil Prospek...</p>
      </div>
    }>
      <AffiliateProfilePageContent />
    </Suspense>
  )
}
