'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Phone,
  X,
  CheckCircle,
  AlertCircle,
  Send,
  Sparkles,
  Loader2
} from 'lucide-react'

interface Affiliate {
  id: string
  username: string
  name: string | null
  waContact: string | null
  profileLink: string | null
  status: string
  niche: string | null
  followers: string | null
  gmv: string | null
  campaign?: { name: string } | null
  pic?: { name: string } | null
  lastContactDate?: string | null
}

interface ChatTemplate {
  id: string
  name: string
  type: string
  content: string
}

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

export default function ContactPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [templates, setTemplates] = useState<ChatTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ChatTemplate | null>(null)
  const [personalizedMessage, setPersonalizedMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAffiliateDropdown, setShowAffiliateDropdown] = useState(false)

  const [copiedText, setCopiedText] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)
  const [copiedWa, setCopiedWa] = useState(false)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingContactType, setPendingContactType] = useState<'whatsapp' | 'tiktok' | null>(null)
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [aiDrafting, setAiDrafting] = useState(false)

  // Queue tracking — IDs contacted in this session
  const [contactedIds, setContactedIds] = useState<string[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [affRes, tempRes] = await Promise.all([
        fetch('/api/affiliates?limit=200&sortBy=username&sortOrder=asc'),
        fetch('/api/settings/templates')
      ])
      if (affRes.ok) {
        const json = await affRes.json()
        setAffiliates(json.data || [])
      }
      if (tempRes.ok) {
        const json = await tempRes.json()
        setTemplates(json.data || [])
        if (json.data && json.data.length > 0) setSelectedTemplate(json.data[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (selectedTemplate) {
      let msg = selectedTemplate.content
      if (selectedAffiliate) {
        msg = msg.replace(/\[Username\]/g, `@${selectedAffiliate.username}`)
        msg = msg.replace(/\[Deadline\]/g, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'))
      } else {
        msg = msg.replace(/\[Username\]/g, '[Nama Creator]')
      }
      setPersonalizedMessage(msg)
    } else {
      setPersonalizedMessage('')
    }
  }, [selectedAffiliate, selectedTemplate])

  const handleAiDraft = async () => {
    if (!selectedAffiliate) {
      toast.error('Pilih creator terlebih dahulu')
      return
    }
    setAiDrafting(true)
    try {
      const res = await fetch('/api/copilot/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliateId: selectedAffiliate.id,
          messageType: selectedTemplate?.type || 'introduction',
          channel: 'WhatsApp',
          templateContent: selectedTemplate?.content,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setPersonalizedMessage(json.message)
        toast.success(json.provider === 'gemini' ? 'Pesan AI berhasil dibuat' : 'Pesan dari template')
      } else {
        toast.error(json.message || 'Gagal membuat draft')
      }
    } catch {
      toast.error('Koneksi gagal')
    } finally {
      setAiDrafting(false)
    }
  }

  const copyText = async (text: string, type: 'text' | 'username' | 'wa') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'text') { setCopiedText(true); setTimeout(() => setCopiedText(false), 2000) }
      else if (type === 'username') { setCopiedUsername(true); setTimeout(() => setCopiedUsername(false), 2000) }
      else if (type === 'wa') { setCopiedWa(true); setTimeout(() => setCopiedWa(false), 2000) }
    } catch (err) { console.error(err) }
  }

  const handleOpenWhatsApp = () => {
    if (!selectedAffiliate?.waContact) { toast.error('Creator ini tidak memiliki nomor WhatsApp.'); return }
    const cleanNumber = selectedAffiliate.waContact.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(personalizedMessage)}`, '_blank')
    setPendingContactType('whatsapp')
    setShowConfirmDialog(true)
  }

  const handleOpenTikTokDM = () => {
    if (!selectedAffiliate) return
    copyText(personalizedMessage, 'text')
    window.open(selectedAffiliate.profileLink || `https://www.tiktok.com/@${selectedAffiliate.username}`, '_blank')
    setPendingContactType('tiktok')
    setShowConfirmDialog(true)
  }

  const handleContactResponse = async (response: 'Sudah Dihubungi' | 'No Response' | 'Reject') => {
    if (!selectedAffiliate) return
    setSubmittingResponse(true)
    try {
      const now = new Date().toISOString()
      const res = await fetch(`/api/affiliates/${selectedAffiliate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: response,
          lastContactDate: now,
          contactVia: pendingContactType || 'whatsapp'
        })
      })
      if (res.ok) {
        // Mark as contacted in this session
        setContactedIds(prev => [...prev, selectedAffiliate.id])

        // Update local affiliate list status
        setAffiliates(prev => prev.map(a =>
          a.id === selectedAffiliate.id ? { ...a, status: response, lastContactDate: now } : a
        ))

        setShowConfirmDialog(false)
        setPendingContactType(null)

        if (response === 'Sudah Dihubungi') {
          toast.success('✅ Status diperbarui & follow-up reminder dijadwalkan 3 hari lagi!')
        } else {
          toast.success(`Status diperbarui ke "${response}"`)
        }

        // Auto-advance to the next uncontacted affiliate
        const currentIndex = affiliates.findIndex(a => a.id === selectedAffiliate.id)
        const nextAffiliate = affiliates.slice(currentIndex + 1).find(a => !contactedIds.includes(a.id) && a.id !== selectedAffiliate.id)
        if (nextAffiliate) {
          setTimeout(() => setSelectedAffiliate(nextAffiliate), 300)
        } else {
          // No more affiliates — clear selection
          setTimeout(() => setSelectedAffiliate(null), 300)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(`Gagal memperbarui status: ${errorData.message || errorData.error || 'Server error'}`)
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.')
    } finally {
      setSubmittingResponse(false)
    }
  }

  // Skip to next affiliate without contacting
  const handleSkipToNext = () => {
    if (!selectedAffiliate) return
    const currentIndex = affiliates.findIndex(a => a.id === selectedAffiliate.id)
    const nextAffiliate = affiliates.slice(currentIndex + 1).find(a => !contactedIds.includes(a.id))
    if (nextAffiliate) {
      setSelectedAffiliate(nextAffiliate)
    } else {
      toast('Tidak ada affiliate berikutnya dalam list.')
    }
  }

  const filteredAffiliates = affiliates.filter(a =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.name && a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-8 w-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6E6E73] text-sm font-medium">Memuat Contact Hub...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Contact Hub</h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Kirim pesan outreach, catat kontak, dan kelola follow-up dari satu tempat.
        </p>
      </div>
      {/* Session Queue Progress */}
      {affiliates.length > 0 && (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[16px] px-5 py-3 shadow-2xs flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-[#007AFF]" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase">Sesi Outreach</div>
              <div className="text-xs font-bold text-[#1D1D1F] dark:text-white">
                <span className="text-[#007AFF]">{contactedIds.length}</span> / {affiliates.length} dihubungi
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex-1 bg-[#F5F5F7] dark:bg-[#1E1E1E] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#007AFF] h-full rounded-full transition-all duration-500"
              style={{ width: `${affiliates.length > 0 ? (contactedIds.length / affiliates.length) * 100 : 0}%` }}
            />
          </div>
          {/* Reset session */}
          {contactedIds.length > 0 && (
            <button
              onClick={() => setContactedIds([])}
              className="text-[10px] font-semibold text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Reset Sesi
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT: Affiliate Selector & Profile Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-4 shadow-2xs">
            <h3 className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider mb-3">1. Pilih Creator</h3>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAffiliateDropdown(!showAffiliateDropdown)}
                className="w-full flex items-center justify-between bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#1D1D1F] dark:text-white focus:outline-none focus:border-[#007AFF] cursor-pointer transition-colors"
              >
                <span className="truncate">{selectedAffiliate ? `@${selectedAffiliate.username}` : 'Pilih creator untuk di-outreach...'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#6E6E73] shrink-0" />
              </button>
              {showAffiliateDropdown && (
                <div className="absolute left-0 right-0 z-40 mt-1.5 rounded-2xl border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] p-2 shadow-2xl">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6E6E73]" />
                    <input
                      type="text"
                      placeholder="Cari username atau nama..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-8 pr-3 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs placeholder-[#6E6E73] focus:outline-none focus:border-[#007AFF] text-[#1D1D1F] dark:text-white"
                    />
                  </div>
                  <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                    {filteredAffiliates.length === 0 ? (
                      <div className="text-[#6E6E73] text-[11px] text-center py-6">Tidak ada hasil.</div>
                    ) : (
                      filteredAffiliates.map((aff) => (
                        <button
                          key={aff.id}
                          type="button"
                          onClick={() => { setSelectedAffiliate(aff); setShowAffiliateDropdown(false); setSearchQuery('') }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                            contactedIds.includes(aff.id)
                              ? 'opacity-50 bg-emerald-50 dark:bg-emerald-950/20'
                              : 'hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 text-[#1D1D1F] dark:text-white'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-mono font-semibold truncate">@{aff.username}</div>
                            {aff.name && <div className="text-[#6E6E73] text-[10px] mt-0.5 truncate">{aff.name}</div>}
                          </div>
                          {contactedIds.includes(aff.id) && (
                            <span className="shrink-0 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">✓ Done</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedAffiliate ? (
            <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-4 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {selectedAffiliate.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-[#1D1D1F] dark:text-white text-sm">@{selectedAffiliate.username}</div>
                    {selectedAffiliate.name && <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">{selectedAffiliate.name}</div>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[selectedAffiliate.status] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                  {selectedAffiliate.status}
                </span>
              </div>

              {(selectedAffiliate.followers || selectedAffiliate.gmv) && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedAffiliate.followers && (
                    <div className="bg-[#F5F5F7] dark:bg-[#1E1E1E] rounded-xl p-2.5">
                      <div className="text-[9px] font-bold text-[#6E6E73] uppercase">Followers</div>
                      <div className="text-xs font-bold text-[#1D1D1F] dark:text-white mt-0.5">{selectedAffiliate.followers}</div>
                    </div>
                  )}
                  {selectedAffiliate.gmv && (
                    <div className="bg-[#F5F5F7] dark:bg-[#1E1E1E] rounded-xl p-2.5">
                      <div className="text-[9px] font-bold text-[#6E6E73] uppercase">GMV L30D</div>
                      <div className="text-xs font-bold text-[#34C759] mt-0.5">{selectedAffiliate.gmv}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 text-[11px]">
                {selectedAffiliate.niche && (
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">Niche</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-white">{selectedAffiliate.niche}</span>
                  </div>
                )}
                {selectedAffiliate.campaign?.name && (
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">Campaign</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-white">{selectedAffiliate.campaign.name}</span>
                  </div>
                )}
                {selectedAffiliate.pic?.name && (
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">PIC</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-white">{selectedAffiliate.pic.name}</span>
                  </div>
                )}
                {selectedAffiliate.lastContactDate && (
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">Last Contact</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-white">
                      {new Date(selectedAffiliate.lastContactDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#38383A] space-y-2">
                <div className="text-[9px] font-bold text-[#6E6E73] uppercase">Kontak</div>
                {selectedAffiliate.waContact ? (
                  <button
                    onClick={() => copyText(selectedAffiliate.waContact!, 'wa')}
                    className="w-full flex items-center gap-2 bg-[#F5F5F7] dark:bg-[#1E1E1E] rounded-xl px-3 py-2 text-xs font-mono text-[#1D1D1F] dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <Phone className="h-3 w-3 text-[#6E6E73] shrink-0" />
                    <span className="flex-1 text-left">{selectedAffiliate.waContact}</span>
                    {copiedWa ? <Check className="h-3 w-3 text-[#34C759]" /> : <Copy className="h-3 w-3 text-[#6E6E73]" />}
                  </button>
                ) : (
                  <div className="text-[11px] text-[#6E6E73] italic">Tidak ada nomor WhatsApp</div>
                )}
              </div>

              <Link
                href={`/affiliates/${selectedAffiliate.id}`}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-[11px] font-semibold text-[#007AFF] hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Buka Profil Lengkap
              </Link>

              {/* Prev / Skip navigation */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    const currentIndex = affiliates.findIndex(a => a.id === selectedAffiliate.id)
                    if (currentIndex > 0) setSelectedAffiliate(affiliates[currentIndex - 1])
                  }}
                  disabled={affiliates.findIndex(a => a.id === selectedAffiliate.id) === 0}
                  className="flex items-center justify-center gap-1 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </button>
                <button
                  onClick={handleSkipToNext}
                  disabled={affiliates.findIndex(a => a.id === selectedAffiliate.id) === affiliates.length - 1}
                  className="flex items-center justify-center gap-1 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  Berikutnya
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-8 text-center shadow-2xs">
              <div className="h-12 w-12 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <User className="h-5 w-5 text-[#6E6E73]" />
              </div>
              <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">Pilih creator untuk melihat profil dan mulai outreach.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Template & Message Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-4 shadow-2xs">
            <h3 className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider mb-3">2. Pilih Template Chat</h3>
            <div className="flex flex-wrap gap-2">
              {templates.length === 0 ? (
                <div className="text-[11px] text-[#6E6E73]">Belum ada template. <Link href="/settings" className="text-[#007AFF] hover:underline">Buat template</Link>.</div>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                      selectedTemplate?.id === t.id
                        ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                        : 'bg-[#F5F5F7] dark:bg-[#1E1E1E] text-[#1D1D1F] dark:text-white border-[#E5E5EA] dark:border-[#38383A] hover:border-zinc-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">3. Preview & Edit Pesan</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedAffiliate || aiDrafting}
                  onClick={handleAiDraft}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 border border-[#007AFF]/20 text-[#007AFF] rounded-full text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  {aiDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Draft
                </button>
                <div className="flex items-center gap-1 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#6E6E73] px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  [Username] [Deadline]
                </div>
              </div>
            </div>
            <textarea
              value={personalizedMessage}
              onChange={(e) => setPersonalizedMessage(e.target.value)}
              rows={9}
              placeholder="Pilih template dan creator untuk melihat preview pesan..."
              className="w-full px-4 py-3 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl text-xs leading-relaxed focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] text-[#1D1D1F] dark:text-white placeholder-[#6E6E73] resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedAffiliate}
                onClick={() => personalizedMessage && copyText(personalizedMessage, 'text')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white rounded-full text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {copiedText ? <Check className="h-3 w-3 text-[#34C759]" /> : <Copy className="h-3 w-3" />}
                Copy Pesan
              </button>
              <button
                type="button"
                disabled={!selectedAffiliate}
                onClick={() => selectedAffiliate && copyText(selectedAffiliate.username, 'username')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white rounded-full text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {copiedUsername ? <Check className="h-3 w-3 text-[#34C759]" /> : <Copy className="h-3 w-3" />}
                Copy Username
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!selectedAffiliate}
              onClick={handleOpenTikTokDM}
              className="flex items-center justify-center gap-2 bg-white dark:bg-[#2C2C2E] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white font-bold py-3.5 px-4 rounded-2xl text-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
            >
              <ExternalLink className="h-4 w-4" />
              Copy & Buka TikTok DM
            </button>
            <button
              type="button"
              disabled={!selectedAffiliate || !selectedAffiliate.waContact}
              onClick={handleOpenWhatsApp}
              className="flex items-center justify-center gap-2 bg-[#34C759] hover:bg-[#2db34a] text-white font-bold py-3.5 px-4 rounded-2xl text-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-sm shadow-[#34C759]/20"
            >
              <MessageCircle className="h-4 w-4 stroke-[2.5]" />
              Kirim via WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[28px] shadow-2xl p-6 max-w-[420px] w-full mx-4 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-10 w-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center mb-3">
                  <MessageCircle className="h-5 w-5 text-[#007AFF]" />
                </div>
                <h2 className="text-base font-bold text-[#1D1D1F] dark:text-white">Apakah berhasil dihubungi?</h2>
                <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  Pilih hasil kontak dengan <span className="font-bold text-[#1D1D1F] dark:text-white">@{selectedAffiliate.username}</span> melalui {pendingContactType === 'whatsapp' ? 'WhatsApp' : 'TikTok DM'}:
                </p>
              </div>
              <button
                onClick={() => { setShowConfirmDialog(false); setPendingContactType(null) }}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 text-[#6E6E73] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleContactResponse('Sudah Dihubungi')}
                disabled={submittingResponse}
                className="w-full flex items-center gap-3 p-4 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-[#E5E5EA] dark:border-[#38383A] hover:border-emerald-200 dark:hover:border-emerald-900/40 rounded-2xl text-left cursor-pointer transition-all group disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1D1D1F] dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Sudah Dihubungi</div>
                  <div className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Status diperbarui + reminder follow-up 3 hari dijadwalkan</div>
                </div>
              </button>

              <button
                onClick={() => handleContactResponse('No Response')}
                disabled={submittingResponse}
                className="w-full flex items-center gap-3 p-4 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-[#E5E5EA] dark:border-[#38383A] hover:border-rose-200 dark:hover:border-rose-900/40 rounded-2xl text-left cursor-pointer transition-all group disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1D1D1F] dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">No Response</div>
                  <div className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Creator tidak merespons (Re-Approach setelah 30 hari)</div>
                </div>
              </button>

              <button
                onClick={() => handleContactResponse('Reject')}
                disabled={submittingResponse}
                className="w-full flex items-center gap-3 p-4 bg-[#F5F5F7] dark:bg-[#1E1E1E] hover:bg-red-50 dark:hover:bg-red-950/20 border border-[#E5E5EA] dark:border-[#38383A] hover:border-red-200 dark:hover:border-red-900/40 rounded-2xl text-left cursor-pointer transition-all group disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                  <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1D1D1F] dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Reject / Tidak Tertarik</div>
                  <div className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Creator menolak atau tidak sesuai</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => { setShowConfirmDialog(false); setPendingContactType(null) }}
              className="w-full text-center text-[11px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Lewati untuk sekarang
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
