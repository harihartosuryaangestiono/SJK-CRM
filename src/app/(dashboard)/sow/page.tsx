'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  RefreshCw,
  Loader2,
  MessageSquare,
  Copy,
  ExternalLink,
  Send,
  Package,
  Video,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Helper: format date ──────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateShort(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ uploaded, total, isOverdue, isCompleted }: { uploaded: number; total: number; isOverdue?: boolean; isCompleted?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((uploaded / total) * 100)) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: isCompleted ? '#16a34a' : isOverdue ? '#dc2626' : '#3b82f6'
          }}
        />
      </div>
      <span className={`text-xs font-bold shrink-0 ${isCompleted ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-foreground'}`}>
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

  const isSampleSent = deal.bucket === 'sample_sent'
  const isSowActive = deal.bucket === 'sow_active'
  const isSowCompleted = deal.bucket === 'sow_completed'
  const isNotStarted = deal.bucket === 'not_started'

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
    if (nextSlot > 5) { toast.error('Maksimal 5 link video'); return }
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
        toast.success('Sample ditandai sudah dikirim!')
        onUpdate()
      } else {
        toast.error(json.message || 'Gagal update')
      }
    } finally {
      setSaving(false)
    }
  }

  // Colors for left border accent
  const accentColor = isSowCompleted
    ? '#16a34a'
    : deal.isOverdue
      ? '#dc2626'
      : isSowActive
        ? '#f59e0b'
        : isSampleSent
          ? '#3b82f6'
          : '#6b7280'

  return (
    <div
      className="rounded-xl border border-border bg-card mb-3 overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="font-bold text-[14px] text-foreground">@{deal.affiliate.username}</span>
          {deal.campaign && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline truncate max-w-[120px]">{deal.campaign.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
            >
              WA
            </a>
          )}
          <span className="text-[11px] text-muted-foreground font-semibold">{expanded ? 'TUTUP' : 'BUKA'}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Progress bar (sow_active / sow_completed) */}
      {(isSowActive || isSowCompleted) && (
        <div className="px-4 pb-3">
          <ProgressBar
            uploaded={deal.uploadedVideoCount}
            total={deal.targetVideo}
            isOverdue={deal.isOverdue}
            isCompleted={isSowCompleted}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-muted-foreground">
              Deadline: {deal.deadline ?? '—'}
            </span>
            {deal.isOverdue && (
              <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                OVERDUE
              </span>
            )}
            {isSowCompleted && (
              <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                LENGKAP
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sample sent info */}
      {isSampleSent && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[12px] text-muted-foreground">Dikirim {fmtDateShort(deal.sampleSentDate)}</span>
          {deal.daysSinceSent !== null && (
            <span className="text-[11px] font-semibold text-blue-500">H+{deal.daysSinceSent}</span>
          )}
        </div>
      )}

      {/* Not started info */}
      {isNotStarted && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">Deal {fmtDateShort(deal.dealDate)} · Belum kirim sample</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">

          {/* Confirm received (sample sent only) */}
          {isSampleSent && (
            <div>
              {!confirmingReceived ? (
                <button
                  onClick={() => setConfirmingReceived(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-green-500 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-colors"
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
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors"
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
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-blue-500 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '📦 Tandai Sample Sudah Dikirim'}
              </button>
              <p className="text-[11px] text-muted-foreground text-center mt-1.5">Akan pindah ke "Sample Dikirim"</p>
            </div>
          )}

          {/* Target VT + video links (sow_active / sow_completed) */}
          {(isSowActive || isSowCompleted) && (
            <>
              {/* Target VT */}
              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Video className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Target VT: {deal.targetVideo}</span>
                  {!editingTarget ? (
                    <button
                      onClick={() => setEditingTarget(true)}
                      className="text-primary text-[12px] font-semibold hover:underline flex items-center gap-1 ml-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Target
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={newTarget}
                        onChange={e => setNewTarget(e.target.value)}
                        className="w-14 text-center border border-border rounded-md text-sm px-1 py-0.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={handleUpdateTarget} disabled={saving} className="text-green-500 hover:text-green-400 p-0.5">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTarget(false)} className="text-muted-foreground hover:text-foreground p-0.5">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Video links list — dynamic grid based on target */}
              {deal.targetVideo > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Progress Video</div>
                  <div className={`grid gap-2 ${deal.targetVideo <= 2 ? 'grid-cols-2' : deal.targetVideo <= 3 ? 'grid-cols-3' : deal.targetVideo <= 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                    {Array.from({ length: deal.targetVideo }, (_, i) => {
                      const link = totalLinks[i]
                      const isFilled = !!link
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border text-center py-3 px-2 transition-all ${isFilled
                              ? 'border-green-500/40 bg-green-500/10'
                              : 'border-border bg-secondary/50'
                            }`}
                        >
                          <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isFilled ? 'text-green-500' : 'text-muted-foreground'}`}>
                            VT {i + 1}
                          </div>
                          {isFilled ? (
                            <a
                              href={link!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-500 hover:underline"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Lihat
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add next video link */}
              {savedLinks.length < deal.targetVideo && !isSowCompleted && (
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Tambah VT {nextSlot}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="# Link VT"
                      value={newLink}
                      onChange={e => setNewLink(e.target.value)}
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddVideoLink}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                    </button>
                  </div>
                </div>
              )}

              {/* SOW Completed CTA */}
              {isSowCompleted && (
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-sm text-green-500 font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  🎉 Raise Komisi ke 9% — Top Affiliate
                </div>
              )}

              {/* Template Chat */}
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer bg-secondary rounded-lg px-3 py-2.5 text-sm font-bold text-foreground select-none list-none">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span>TEMPLATE CHAT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold ${deal.isOverdue ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      H+{daysSince} —{' '}
                      {deal.uploadedVideoCount === 0
                        ? 'Belum ada VT'
                        : `${deal.uploadedVideoCount}/${deal.targetVideo} VT`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </div>
                </summary>
                <div className="mt-2 px-3 py-3 bg-card border border-border rounded-lg">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{templateMsg}</p>
                  <div className="flex gap-3 mt-3 pt-2 border-t border-border">
                    <button
                      onClick={() => { navigator.clipboard.writeText(templateMsg); toast.success('Template disalin!') }}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Salin
                    </button>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 font-semibold hover:underline flex items-center gap-1">
                        <Send className="w-3 h-3" /> Kirim via WA
                      </a>
                    )}
                  </div>
                </div>
              </details>
            </>
          )}

          {/* Info footer */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border">
            <span>GMV: {deal.affiliate.gmv || 'belum tercatat'}</span>
            <span>·</span>
            <span>PIC: {deal.pic?.name || '—'}</span>
            <span>·</span>
            <span>Deal: {fmtDate(deal.dealDate)}</span>
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
  icon,
  children,
  defaultOpen = true
}: {
  title: string
  count: number
  color: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-8">
      <div
        className="flex items-center gap-3 mb-3 cursor-pointer select-none group"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color }}>
            {title}
          </h2>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + '22', color }}
        >
          {count}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: color + '33' }} />
        {open ? <ChevronUp className="w-4 h-4 transition-transform" style={{ color }} /> : <ChevronDown className="w-4 h-4 transition-transform" style={{ color }} />}
      </div>
      {open && (
        <>
          {count === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
              Tidak ada creator di bagian ini
            </div>
          ) : (
            <div>{children}</div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + '18' }}>
          {icon}
        </div>
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
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
  const totalSampleSent = data?.sampleSent.length ?? 0
  const totalNotStarted = data?.notStarted.length ?? 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">SOW Tracker</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Pantau progress video creator setelah deal</p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData() }}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-secondary transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard
                label="Sample Dikirim"
                value={totalSampleSent}
                color="#3b82f6"
                icon={<Package className="w-4 h-4" style={{ color: '#3b82f6' }} />}
              />
              <StatCard
                label="SOW Berjalan"
                value={totalActive}
                color="#f59e0b"
                icon={<Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />}
              />
              <StatCard
                label="Overdue"
                value={totalOverdue}
                color="#ef4444"
                icon={<AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />}
              />
              <StatCard
                label="SOW Lengkap"
                value={totalCompleted}
                color="#16a34a"
                icon={<CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />}
              />
            </div>
          )}

          {/* Campaign filter — pill style, integrated */}
          {campaigns.length > 0 && (
            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCampaignFilter('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${campaignFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                  }`}
              >
                Semua Campaign
              </button>
              {campaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCampaignFilter(c.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${campaignFilter === c.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Memuat data SOW...</span>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* ─── SAMPLE DIKIRIM ─── */}
            <Section
              title="Sample Dikirim"
              count={totalSampleSent}
              color="#3b82f6"
              icon={<Package className="w-4 h-4" style={{ color: '#3b82f6' }} />}
            >
              {data.sampleSent.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>

            {/* ─── SOW BERJALAN ─── */}
            <Section
              title="SOW Berjalan"
              count={totalActive}
              color="#f59e0b"
              icon={<Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />}
            >
              {data.sowActive.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>

            {/* ─── SOW LENGKAP ─── */}
            <Section
              title="SOW Lengkap — Raise Komisi"
              count={totalCompleted}
              color="#16a34a"
              icon={<CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />}
            >
              {data.sowCompleted.map(deal => (
                <DealCard key={deal.id} deal={deal} onUpdate={fetchData} />
              ))}
            </Section>

            {/* ─── BELUM MULAI ─── */}
            <Section
              title="Deal — Belum Kirim Sample"
              count={totalNotStarted}
              color="#6b7280"
              icon={<Package className="w-4 h-4" style={{ color: '#6b7280' }} />}
              defaultOpen={totalNotStarted > 0}
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
