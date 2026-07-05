'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Handshake,
  DollarSign,
  Calendar,
  Layers,
  CheckCircle,
  Truck,
  Video,
  Play,
  Tv,
  Coins,
  User,
  Loader2,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

// All progress campaign stages in chronological order with fixed weight for progress bar
const PROGRESS_STAGES = [
  { id: 'NOT_STARTED',      label: 'Not Started',    icon: Layers,      weight: 0   },
  { id: 'PRODUCT_SENT',     label: 'Product Sent',   icon: Truck,       weight: 14  },
  { id: 'CREATOR_RECEIVED', label: 'Received',       icon: CheckCircle, weight: 28  },
  { id: 'VIDEO_RECORDING',  label: 'Recording',      icon: Video,       weight: 42  },
  { id: 'VIDEO_UPLOADED',   label: 'Uploaded',       icon: Play,        weight: 57  },
  { id: 'LIVE_SCHEDULED',   label: 'Live Scheduled', icon: Calendar,    weight: 71  },
  { id: 'LIVE_DONE',        label: 'Live Done',      icon: Tv,          weight: 85  },
  { id: 'COMPLETED',        label: 'Completed',      icon: CheckCircle, weight: 100 },
  { id: 'PAID',             label: 'Paid',           icon: Coins,       weight: 100 }
]

interface Deal {
  id: string
  dealDate: string
  nominal: number
  product: string
  statusCampaign: string
  targetVideo: number
  targetLive: number
  deadline: string | null
  completionRate: number
  progressCampaign: string
  sowStatus: string | null
  sampleSentDate: string | null
  sampleReceivedDate: string | null
  videoLink1: string | null
  videoLink2: string | null
  videoLink3: string | null
  uploadedVideoCount: number
  affiliate: {
    id: string
    username: string
    name: string | null
    followers: string | null
  }
  campaign: { name: string }
  pic: { name: string } | null
}

// ── Inline editable field component ─────────────────────────────────────────
function InlineField({
  label,
  value,
  type = 'text',
  prefix,
  displayValue,
  onSave
}: {
  label: string
  value: string
  type?: string
  prefix?: string
  displayValue?: string
  onSave: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 50) }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  return (
    <div className="min-w-0">
      <span className="text-[9px] text-[#8E8E93] block uppercase font-bold tracking-wider select-none mb-0.5">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
            className="w-32 bg-white dark:bg-zinc-800 border border-[#007AFF] rounded-lg px-2 py-1 text-[11px] text-[#1D1D1F] dark:text-white focus:outline-none"
          />
          <button onClick={commit} disabled={saving} className="h-6 w-6 rounded-md bg-[#007AFF] text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </button>
          <button onClick={() => { setDraft(value); setEditing(false) }} className="h-6 w-6 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-500 flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5 cursor-pointer">
          <span className="font-bold text-[#1D1D1F] dark:text-zinc-200 text-[11px]">
            {prefix}{displayValue || value || '-'}
          </span>
          <Pencil className="h-2.5 w-2.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  )
}

// ── Urgency badge ────────────────────────────────────────────────────────────
function UrgencyBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-2.5 w-2.5" /> Overdue {Math.abs(daysLeft)}h
      </span>
    )
  }
  if (daysLeft <= 3) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
        <Clock className="h-2.5 w-2.5" /> {daysLeft}h tersisa
      </span>
    )
  }
  return null
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchDeals = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      if (campaignFilter !== 'all') query.append('campaignId', campaignFilter)
      const res = await fetch(`/api/deals?${query}`)
      if (res.ok) {
        const json = await res.json()
        setDeals(json.data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const json = await res.json()
        setCampaigns(json.data || [])
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchDeals() }, [campaignFilter])
  useEffect(() => { fetchCampaigns() }, [])

  // Update deal progress step — bar is derived from stage weight (not uploadedVideoCount)
  const handleUpdateProgress = async (dealId: string, stageId: string) => {
    const stage = PROGRESS_STAGES.find(s => s.id === stageId)
    if (!stage) return

    setDeals(prev => prev.map(d =>
      d.id === dealId
        ? { ...d, progressCampaign: stageId, completionRate: stage.weight, statusCampaign: stage.label }
        : d
    ))

    try {
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dealId,
          progressCampaign: stageId,
          completionRate: stage.weight,
          statusCampaign: stage.label
        })
      })
      if (!res.ok) { fetchDeals(); toast.error('Gagal update progress') }
      else toast.success(`Progress: ${stage.label}`)
    } catch (e) { console.error(e); fetchDeals() }
  }

  // Inline save for nominal / deadline
  const handleSaveDealField = async (dealId: string, field: 'nominal' | 'deadline', raw: string): Promise<void> => {
    let value: any = raw
    if (field === 'nominal') value = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0
    if (field === 'deadline') value = raw || null

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, [field]: value } : d))

    try {
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dealId, [field]: value })
      })
      if (res.ok) toast.success('Berhasil disimpan!')
      else { fetchDeals(); toast.error('Gagal menyimpan') }
    } catch { fetchDeals(); toast.error('Koneksi bermasalah') }
  }

  // Financial summary metrics
  const totalNominal = deals.reduce((acc, curr) => acc + (curr.nominal || 0), 0)
  const totalCompleted = deals.filter(d => d.progressCampaign === 'COMPLETED' || d.progressCampaign === 'PAID').length
  const totalPaid = deals.filter(d => d.progressCampaign === 'PAID').reduce((acc, curr) => acc + (curr.nominal || 0), 0)

  return (
    <div className="fade-in space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Top Banner Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">Deal Affiliate</h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-relaxed">
            Tracking pengerjaan SOW, pengiriman produk, upload video, hingga pembayaran komisi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider select-none">Filter Campaign:</span>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="apple-input bg-white dark:bg-[#1E1E1E] text-xs font-semibold cursor-pointer w-48 h-9"
          >
            <option value="all">Semua Campaign</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Summaries Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center gap-3.5 p-2">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#8E8E93] font-bold uppercase block select-none tracking-wider">Total Nilai Deal</span>
            <span className="text-[15px] font-bold text-[#1D1D1F] dark:text-white">Rp {totalNominal.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-2 border-t md:border-t-0 md:border-l md:border-r border-[#F2F2F7] dark:border-[#38383A]">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#8E8E93] font-bold uppercase block select-none tracking-wider">Deal Selesai (SOW)</span>
            <span className="text-[15px] font-bold text-[#1D1D1F] dark:text-white">{totalCompleted} / {deals.length} SOW</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-2 border-t md:border-t-0 border-[#F2F2F7] dark:border-[#38383A]">
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#8E8E93] font-bold uppercase block select-none tracking-wider">Total Komisi Terbayar</span>
            <span className="text-[15px] font-bold text-[#1D1D1F] dark:text-white">Rp {totalPaid.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
          <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Memuat riwayat deal...</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="apple-card p-12 text-center text-zinc-500 font-medium">
          <Handshake className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          Belum ada data deal untuk campaign ini.
        </div>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => {
            const currentStageIdx = PROGRESS_STAGES.findIndex(s => s.id === deal.progressCampaign)
            const safeIdx = currentStageIdx < 0 ? 0 : currentStageIdx
            const currentStage = PROGRESS_STAGES[safeIdx]
            const progressPct = currentStage.weight

            const barColor = deal.sowStatus === 'Overdue'
              ? 'bg-red-500'
              : progressPct >= 100 ? 'bg-emerald-500'
              : progressPct >= 57  ? 'bg-[#007AFF]'
              : 'bg-amber-400'

            return (
              <div key={deal.id} className="apple-card p-0 overflow-hidden">
                {/* Card header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-[#F2F2F7] dark:border-[#38383A]/60">
                  {/* Avatar + identity */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-xl flex items-center justify-center font-mono text-[#007AFF] text-xs font-bold shrink-0">
                      @{deal.affiliate.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link href={`/affiliates/${deal.affiliate.id}`} className="font-mono text-sm font-bold text-[#1D1D1F] dark:text-zinc-200 hover:text-[#007AFF] transition-colors">
                          @{deal.affiliate.username}
                        </Link>
                        <span className="bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-750 px-2 py-0.5 rounded-full text-[9px] font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
                          {deal.campaign.name}
                        </span>
                        <UrgencyBadge deadline={deal.deadline} />
                        {deal.sowStatus === 'Overdue' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                            <AlertTriangle className="h-2.5 w-2.5" /> SOW Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-medium mt-0.5">Produk: {deal.product}</p>
                    </div>
                  </div>

                  {/* Editable metadata strip */}
                  <div className="flex items-center gap-5 flex-wrap">
                    {/* Nominal Deal — inline edit */}
                    <InlineField
                      label="Nominal Deal"
                      value={String(deal.nominal || 0)}
                      type="number"
                      prefix="Rp "
                      displayValue={(deal.nominal || 0).toLocaleString('id-ID')}
                      onSave={(v) => handleSaveDealField(deal.id, 'nominal', v)}
                    />

                    {/* SOW Targets */}
                    <div>
                      <span className="text-[9px] text-[#8E8E93] block uppercase font-bold tracking-wider select-none mb-0.5">SOW Targets</span>
                      <span className="font-bold text-[#1D1D1F] dark:text-zinc-200 text-[11px]">
                        {deal.targetVideo} VT{deal.targetLive > 0 ? ` • ${deal.targetLive} Live` : ''}
                      </span>
                    </div>

                    {/* Deadline SOW — inline edit */}
                    <InlineField
                      label="Deadline SOW"
                      value={deal.deadline ? new Date(deal.deadline).toISOString().split('T')[0] : ''}
                      type="date"
                      displayValue={deal.deadline ? new Date(deal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      onSave={(v) => handleSaveDealField(deal.id, 'deadline', v)}
                    />

                    {/* PIC */}
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-full flex items-center justify-center text-[#8E8E93]">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-[#1D1D1F] dark:text-zinc-200 text-[11px]">
                        {deal.pic?.name.split(' ')[0] || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SOW Checklist */}
                <div className="px-5 pt-4 pb-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#8E8E93] uppercase font-bold tracking-wider select-none">
                      Campaign SOW Checklist — klik tahap untuk update
                    </span>
                    <span className="text-[10px] font-bold text-[#1D1D1F] dark:text-white">{currentStage.label}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {PROGRESS_STAGES.map((stage, sIdx) => {
                      const isCompleted = sIdx < safeIdx
                      const isCurrent   = sIdx === safeIdx
                      const Icon = stage.icon
                      return (
                        <React.Fragment key={stage.id}>
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(deal.id, stage.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-[0.97] ${
                              isCurrent
                                ? 'bg-[#34C759] text-white border-[#34C759] shadow-[0_2px_8px_rgba(52,199,89,0.35)]'
                                : isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-[#F5F5F7] dark:bg-zinc-800 border-[#E5E5EA] dark:border-zinc-700 text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600'
                            }`}
                          >
                            {isCompleted
                              ? <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              : <Icon className="h-3 w-3 shrink-0" />
                            }
                            {stage.label}
                          </button>
                          {sIdx < PROGRESS_STAGES.length - 1 && (
                            <ChevronRight className="h-3 w-3 text-[#D1D1D6] dark:text-zinc-700 shrink-0 hidden sm:inline" />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>

                {/* Progress bar — synced to stage weight */}
                <div className="px-5 pb-5 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#8E8E93] select-none">
                    <span>SOW PROGRESS BAR</span>
                    <div className="flex items-center gap-2">
                      {deal.sowStatus && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          deal.sowStatus === 'Completed'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                            : deal.sowStatus === 'Overdue'
                            ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                            : 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400'
                        }`}>
                          {deal.sowStatus}
                        </span>
                      )}
                      <span className="text-[#1D1D1F] dark:text-white text-xs font-bold">{progressPct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Video links quick preview */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {[deal.videoLink1, deal.videoLink2, deal.videoLink3].filter(Boolean).map((link, i) => (
                      <a
                        key={i}
                        href={link!}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-bold hover:bg-[#007AFF]/20 transition-colors"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        Video {i + 1}
                      </a>
                    ))}
                    <Link
                      href={`/affiliates/${deal.affiliate.id}`}
                      className="flex items-center gap-1 ml-auto px-2.5 py-1 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 text-[#6E6E73] dark:text-zinc-400 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Detail SOW →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
