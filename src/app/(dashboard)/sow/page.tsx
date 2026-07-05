'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Edit2,
  Check,
  X,
  Send,
  RefreshCw,
  Filter,
  TrendingUp,
  Loader2,
  Video,
  MessageSquare
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface VideoLink { url: string; index: number; savedAt?: string }

interface DealSOW {
  id: string
  dealDate: string
  targetVideo: number
  uploadedVideoCount: number
  sowStatus: string
  progressPercent: number
  sampleSentDate: string | null
  sampleReceivedDate: string | null
  videoLink1: string | null
  videoLink2: string | null
  videoLink3: string | null
  videoLink4: string | null
  videoLink5: string | null
  videoLinks: string[]
  daysSinceSent: number | null
  daysSinceReceived: number | null
  isOverdue: boolean
  deadline: string | null
  bucket: string
  affiliate: {
    id: string
    username: string
    name: string | null
    followers: string | null
    gmv: string | null
    waContact: string | null
    status: string
  }
  campaign: { id: string; name: string }
  pic: { id: string; name: string } | null
}

interface SOWData {
  sampleSent: DealSOW[]
  sowActive: DealSOW[]
  sowCompleted: DealSOW[]
  notStarted: DealSOW[]
}

// ─── Helper: format date to readable ID ──────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── SOW Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status, isOverdue }: { status: string; isOverdue?: boolean }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border border-red-400 text-red-600 bg-red-50">
        OVERDUE
      </span>
    )
  }
  if (status === 'Completed' || status === 'sow_completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border border-green-500 text-green-700 bg-green-50">
        SOW LENGKAP
      </span>
    )
  }
  if (status === 'sample_sent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border border-blue-400 text-blue-700 bg-blue-50">
        BARANG DIKIRIM
      </span>
    )
  }
  return null
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ uploaded, total, isOverdue, isCompleted }: { uploaded: number; total: number; isOverdue?: boolean; isCompleted?: boolean }) {
  const segments = Array.from({ length: total }, (_, i) => i < uploaded)
  const color = isCompleted ? '#16a34a' : isOverdue ? '#dc2626' : '#2563eb'

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5 flex-1">
        {segments.map((filled, i) => (
          <div
            key={i}
            className="h-2 flex-1 rounded-sm transition-all"
            style={{ backgroundColor: filled ? color : '#e5e7eb' }}
          />
        ))}
      </div>
      <span className="text-xs font-bold ml-2" style={{ color: isOverdue ? '#dc2626' : '#374151' }}>
        {uploaded}/{total} VT
      </span>
    </div>
  )
}

// ─── Single Deal Card ─────────────────────────────────────────────────────────
function DealCard({ deal, onUpdate }: { deal: DealSOW; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [editingTarget, setEditingTarget] = useState(false)
  const [newTarget, setNewTarget] = useState(deal.targetVideo.toString())
  const [saving, setSaving] = useState(false)
  const [confirmingReceived, setConfirmingReceived] = useState(false)

  const isSampleSent    = deal.bucket === 'sample_sent'
  const isSowActive     = deal.bucket === 'sow_active'
  const isSowCompleted  = deal.bucket === 'sow_completed'
  const isNotStarted    = deal.bucket === 'not_started'

  const totalLinks = [deal.videoLink1, deal.videoLink2, deal.videoLink3, deal.videoLink4, deal.videoLink5]
  const savedLinks = totalLinks.filter(Boolean) as string[]
  const nextSlot = savedLinks.length + 1

  // Template chat message
  const daysSince = deal.daysSinceReceived ?? deal.daysSinceSent ?? 0
  const templateMsg = isSowCompleted
    ? `Hai kak @${deal.affiliate.username}! 🎉 SOW sudah lengkap ${deal.uploadedVideoCount}/${deal.targetVideo} VT. Raise Komisi ke 9% — Top Affiliate!`
    : isSowActive
    ? `Halo kak @${deal.affiliate.username}! Hari ini H+${daysSince} — sudah ${deal.uploadedVideoCount}/${deal.targetVideo} VT, ingatkan sisa ${deal.targetVideo - deal.uploadedVideoCount} VT ya kak 🙏`
    : `Hai kak @${deal.affiliate.username}! Paket sudah dikirim ${fmtDate(deal.sampleSentDate)}, mohon dikonfirmasi saat diterima ya kak 📦`

  // WA link
  const waLink = deal.affiliate.waContact
    ? `https://wa.me/${deal.affiliate.waContact.replace(/\D/g, '')}?text=${encodeURIComponent(templateMsg)}`
    : null

  const handleAddVideoLink = async () => {
    if (!newLink.trim()) { toast.error('Masukkan URL video TikTok'); return }
    setSaving(true)
    try {
      const linkKey = `videoLink${nextSlot}` as string
      const body: any = { id: deal.id, uploadedVideoCount: savedLinks.length + 1 }
      body[linkKey] = newLink.trim()
      const res = await fetch('/api/deals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (json.success) {
        toast.success(`VT${nextSlot} berhasil disimpan!`)
        setNewLink('')
        onUpdate()
      } else {
        toast.error(json.message || 'Gagal menyimpan link')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTarget = async () => {
    const t = parseInt(newTarget, 10)
    if (isNaN(t) || t < 1 || t > 5) { toast.error('Target VT harus antara 1-5'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/deals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deal.id, targetVideo: t }) })
      const json = await res.json()
      if (json.success) {
        toast.success('Target VT diperbarui')
        setEditingTarget(false)
        onUpdate()
      } else {
        toast.error(json.message || 'Gagal update target')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmReceived = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id, sampleReceivedDate: new Date().toISOString() })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Sample diterima dikonfirmasi — SOW mulai!')
        setConfirmingReceived(false)
        onUpdate()
      } else {
        toast.error(json.message || 'Gagal konfirmasi')
      }
    } finally {
      setSaving(false)
    }
  }

  // Mark sample as sent (for not_started deals)
  const handleMarkSampleSent = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id, sampleSentDate: new Date().toISOString() })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Sample ditandai sudah dikirim — pindah ke bagian Sample Dikirim!')
        onUpdate()
      } else {
        toast.error(json.message || 'Gagal update')
      }
    } finally {
      setSaving(false)
    }
  }

  const borderColor = isSowCompleted
    ? '#16a34a'
    : deal.isOverdue
    ? '#dc2626'
    : isSampleSent
    ? '#2563eb'
    : isNotStarted
    ? '#9ca3af'
    : '#d1d5db'

  const cardBg = isSowCompleted
    ? '#f0fdf4'
    : deal.isOverdue
    ? '#fff5f5'
    : isSampleSent
    ? '#eff6ff'
    : '#ffffff'

  return (
    <div
      className="rounded-xl border-l-4 mb-3 shadow-sm overflow-hidden"
      style={{ borderLeftColor: borderColor, backgroundColor: cardBg }}
    >
      {/* Card header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-bold text-[15px] text-gray-900">@{deal.affiliate.username}</span>
          <StatusBadge status={isSowCompleted ? 'sow_completed' : isSampleSent ? 'sample_sent' : deal.sowStatus} isOverdue={deal.isOverdue} />
          {deal.campaign && (
            <span className="text-[11px] text-gray-400 hidden sm:inline">{deal.campaign.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] font-semibold text-green-600 hover:underline"
            >
              WA
            </a>
          )}
          <span className="text-xs text-gray-500 font-semibold">{expanded ? 'TUTUP' : 'BUKA'}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Progress bar for sow_active / sow_completed */}
      {(isSowActive || isSowCompleted) && (
        <div className="px-4 pb-2">
          <ProgressBar
            uploaded={deal.uploadedVideoCount}
            total={deal.targetVideo}
            isOverdue={deal.isOverdue}
            isCompleted={isSowCompleted}
          />
          <div className="text-[11px] text-gray-500 mt-0.5">
            Deadline: {deal.deadline ?? '—'}
          </div>
        </div>
      )}

      {/* Sample sent info */}
      {isSampleSent && (
        <div className="px-4 pb-2">
          <span className="text-[12px] text-gray-500">Kirim: {fmtDate(deal.sampleSentDate)}</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">

          {/* Confirm received (sample sent only) */}
          {isSampleSent && (
            <div>
              {!confirmingReceived ? (
                <button
                  onClick={() => setConfirmingReceived(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-green-700 bg-green-50 border border-green-300 hover:bg-green-100 transition-colors"
                >
                  ✅ Konfirmasi Terima — SOW Mulai
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmReceived}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, konfirmasi sekarang'}
                  </button>
                  <button
                    onClick={() => setConfirmingReceived(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mark sample sent (not started only) */}
          {isNotStarted && (
            <div>
              <button
                onClick={handleMarkSampleSent}
                disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '📦 Tandai Sample Sudah Dikirim'}
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-1">Produk akan pindah ke bagian “Sample Dikirim”</p>
            </div>
          )}

          {/* Target VT + video links (sow_active / sow_completed) */}
          {(isSowActive || isSowCompleted) && (
            <>
              {/* Target VT */}
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                  <span className="font-medium">Target VT: {deal.targetVideo}</span>
                  {!editingTarget ? (
                    <button
                      onClick={() => setEditingTarget(true)}
                      className="text-blue-600 text-[12px] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Target — nego VT
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={newTarget}
                        onChange={e => setNewTarget(e.target.value)}
                        className="w-14 text-center border border-gray-300 rounded text-sm px-1 py-0.5"
                      />
                      <button onClick={handleUpdateTarget} disabled={saving} className="text-green-600 hover:text-green-800">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTarget(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Video links list */}
              {savedLinks.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wide">VT Masuk</div>
                  <div className="space-y-1">
                    {savedLinks.map((url, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-500 w-7">VT{i + 1}</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate max-w-[240px] sm:max-w-sm"
                          >
                            {url}
                          </a>
                        </div>
                        <span className="text-[11px] text-gray-400 ml-2 shrink-0">
                          {fmtDate(deal.dealDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add next video link */}
              {savedLinks.length < deal.targetVideo && !isSowCompleted && (
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                    Tambah VT {nextSlot}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://vt.tiktok.com/..."
                      value={newLink}
                      onChange={e => setNewLink(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={handleAddVideoLink}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 transition-colors disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                    </button>
                  </div>
                </div>
              )}

              {/* SOW Completed CTA */}
              {isSowCompleted && (
                <div className="p-3 rounded-lg border border-green-400 bg-green-50 text-sm text-green-800 font-semibold text-center">
                  🎉 Raise Komisi ke 9% — Top Affiliate
                </div>
              )}

              {/* Template Chat */}
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 select-none list-none">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>TEMPLATE CHAT</span>
                  </div>
                  <div>
                    <span className={`text-xs font-semibold ${deal.isOverdue ? 'text-orange-600' : 'text-gray-500'}`}>
                      H+{daysSince} —{' '}
                      {deal.uploadedVideoCount === 0
                        ? 'Belum ada VT, freshness angle'
                        : `Sudah ${deal.uploadedVideoCount}/${deal.targetVideo}, ingatkan sisa`}
                    </span>
                    <span className="ml-2 text-gray-400 group-open:rotate-180 inline-block transition-transform">▼</span>
                  </div>
                </summary>
                <div className="mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{templateMsg}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(templateMsg); toast.success('Template disalin!') }}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Salin
                    </button>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 font-semibold hover:underline">
                        Kirim via WA
                      </a>
                    )}
                  </div>
                </div>
              </details>
            </>
          )}

          {/* GMV info */}
          <div className="text-xs text-gray-400 pt-1">
            GMV: {deal.affiliate.gmv || 'belum tercatat'} · PIC: {deal.pic?.name || '—'} · Deal: {fmtDate(deal.dealDate)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  count,
  color,
  subtitle,
  children,
  defaultOpen = true
}: {
  title: string
  count: number
  color: string
  subtitle?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-3 mb-2 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color }}>
          {title}
        </h2>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + '22', color }}
        >
          {count}
        </span>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        <div className="flex-1 border-t" style={{ borderColor: color }} />
        {open ? <ChevronUp className="w-4 h-4" style={{ color }} /> : <ChevronDown className="w-4 h-4" style={{ color }} />}
      </div>
      {open && <div>{children}</div>}
      {open && count === 0 && (
        <div className="text-sm text-gray-400 text-center py-4">Tidak ada creator di bagian ini</div>
      )}
    </div>
  )
}

// ─── Main SOW Page ────────────────────────────────────────────────────────────
export default function SOWPage() {
  const [data, setData] = useState<SOWData | null>(null)
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [campaignFilter, setCampaignFilter] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (campaignFilter !== 'all') params.set('campaignId', campaignFilter)
      const res = await fetch(`/api/sow?${params}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (e) {
      toast.error('Gagal memuat data SOW')
    } finally {
      setLoading(false)
    }
  }, [campaignFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(j => { if (j.success) setCampaigns(j.data) })
  }, [])

  const totalOverdue = data?.sowActive.filter(d => d.isOverdue).length ?? 0
  const totalActive = data?.sowActive.length ?? 0
  const totalCompleted = data?.sowCompleted.length ?? 0

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">SOW Tracker</h1>
              <p className="text-sm text-gray-500 mt-0.5">Pantau progress video creator setelah deal</p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData() }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Stats summary */}
          {data && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl font-bold text-blue-600">{data.sampleSent.length}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Sample Dikirim</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl font-bold text-amber-600">{totalActive}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">SOW Berjalan</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Overdue</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">SOW Lengkap</div>
              </div>
            </div>
          )}

          {/* Campaign filter */}
          <div className="mt-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">Semua Campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Memuat data SOW...</span>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* ─── SAMPLE DIKIRIM ───────────────────────────────────────── */}
            <Section
              title="Sample Dikirim"
              count={data.sampleSent.length}
              color="#2563eb"
              subtitle={data.sampleSent.length > 0 ? 'menunggu konfirmasi terima' : undefined}
            >
              {data.sampleSent.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>

            {/* ─── SOW BERJALAN ─────────────────────────────────────────── */}
            <Section
              title="SOW Berjalan"
              count={totalActive}
              color="#d97706"
              subtitle={totalOverdue > 0 ? `${totalOverdue} overdue` : undefined}
            >
              {data.sowActive.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>

            {/* ─── SOW LENGKAP ──────────────────────────────────────────── */}
            <Section
              title="SOW Lengkap — Perlu Raise Komisi"
              count={totalCompleted}
              color="#16a34a"
              subtitle={totalCompleted > 0 ? `${totalCompleted} perlu raise komisi` : undefined}
              defaultOpen={true}
            >
              {data.sowCompleted.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>

            {/* ─── BELUM MULAI ────────────────────────────────────────────────── */}
            <Section
              title="Deal — Belum Kirim Sample"
              count={data.notStarted.length}
              color="#6b7280"
              defaultOpen={true}
            >
              {data.notStarted.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
