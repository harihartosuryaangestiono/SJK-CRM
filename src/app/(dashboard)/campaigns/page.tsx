'use client'

import React, { useState, useEffect } from 'react'
import {
  Award,
  Plus,
  DollarSign,
  Users,
  Video,
  Tv,
  X,
  PlusCircle,
  Loader2,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  status: string
  budget: number
  targetCreator: number
  targetVideo: number
  targetLive: number
  startDate: string | null
  endDate: string | null
  description: string | null
  _count?: {
    affiliates: number
    deals: number
  }
}

const EMPTY_FORM = {
  name: '',
  status: 'UPCOMING',
  budget: '0',
  targetCreator: '0',
  targetVideo: '0',
  targetLive: '0',
  startDate: '',
  endDate: '',
  description: ''
}

function getStatusStyle(stat: string) {
  if (stat === 'ACTIVE')    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30'
  if (stat === 'COMPLETED') return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30'
}

function getStatusDot(stat: string) {
  if (stat === 'ACTIVE')    return 'bg-emerald-500'
  if (stat === 'COMPLETED') return 'bg-zinc-400'
  return 'bg-blue-500'
}

// ── Campaign Form Modal ──────────────────────────────────────────────────────
function CampaignModal({
  campaign,
  onClose,
  onSaved
}: {
  campaign: Campaign | null   // null = create mode
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(
    campaign
      ? {
          name: campaign.name,
          status: campaign.status,
          budget: String(campaign.budget),
          targetCreator: String(campaign.targetCreator),
          targetVideo: String(campaign.targetVideo),
          targetLive: String(campaign.targetLive),
          startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
          endDate:   campaign.endDate   ? new Date(campaign.endDate).toISOString().split('T')[0]   : '',
          description: campaign.description || ''
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!form.name.trim()) { setErr('Nama campaign wajib diisi'); return }
    setSaving(true)
    try {
      const body: any = {
        name: form.name.trim(),
        status: form.status,
        budget: parseFloat(form.budget) || 0,
        targetCreator: parseInt(form.targetCreator, 10) || 0,
        targetVideo: parseInt(form.targetVideo, 10) || 0,
        targetLive: parseInt(form.targetLive, 10) || 0,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        description: form.description || null
      }
      if (campaign) body.id = campaign.id

      const res = await fetch('/api/campaigns', {
        method: campaign ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (json.success) {
        toast.success(campaign ? 'Campaign diperbarui!' : 'Campaign dibuat!')
        onSaved()
        onClose()
      } else {
        setErr(json.message || 'Gagal menyimpan campaign')
      }
    } catch { setErr('Terjadi kesalahan koneksi') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] w-full max-w-[500px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2F2F7] dark:border-[#38383A]/60 px-5 py-4">
          <h3 className="text-[13px] font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            {campaign ? <Pencil className="h-4 w-4 text-[#007AFF]" /> : <PlusCircle className="h-4 w-4 text-[#007AFF]" />}
            {campaign ? `Edit Campaign: ${campaign.name}` : 'Buat Campaign Baru'}
          </h3>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white transition-colors p-1 cursor-pointer rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {err && (
            <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 rounded-xl p-3 text-[11.5px] text-red-600 dark:text-red-400 font-medium">
              ⚠ {err}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Nama Campaign *</label>
            <input
              type="text" required placeholder="e.g. July Launch Campaign"
              value={form.name} onChange={e => set('name', e.target.value)}
              className="apple-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Deskripsi</label>
            <textarea
              rows={2} placeholder="Deskripsi singkat campaign..."
              value={form.description} onChange={e => set('description', e.target.value)}
              className="apple-input resize-none"
            />
          </div>

          {/* Status + Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="apple-input text-xs font-semibold cursor-pointer">
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Budget (Rp)</label>
              <input type="number" placeholder="10000000" value={form.budget} onChange={e => set('budget', e.target.value)} className="apple-input" />
            </div>
          </div>

          {/* Start + End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Tanggal Mulai</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="apple-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Tanggal Selesai</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="apple-input" />
            </div>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Target Creator</label>
              <input type="number" min="0" value={form.targetCreator} onChange={e => set('targetCreator', e.target.value)} className="apple-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Target Video</label>
              <input type="number" min="0" value={form.targetVideo} onChange={e => set('targetVideo', e.target.value)} className="apple-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block">Target Live</label>
              <input type="number" min="0" value={form.targetLive} onChange={e => set('targetLive', e.target.value)} className="apple-input" />
            </div>
          </div>

          <div className="pt-2 border-t border-[#F2F2F7] dark:border-[#38383A]/60 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="apple-btn-secondary text-xs cursor-pointer">Batal</button>
            <button type="submit" disabled={saving} className="apple-btn-primary text-xs shadow-md shadow-[#007AFF]/10 cursor-pointer disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (campaign ? 'Simpan Perubahan' : 'Buat Campaign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ campaign, onClose, onDeleted }: { campaign: Campaign; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id })
      })
      const json = await res.json()
      if (json.success) { toast.success('Campaign dihapus'); onDeleted(); onClose() }
      else toast.error(json.message || 'Gagal menghapus')
    } catch { toast.error('Koneksi bermasalah') }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] w-full max-w-[360px] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">Hapus Campaign?</h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">"{campaign.name}"</p>
          </div>
        </div>
        <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
          Data campaign akan dihapus secara permanen. Deal yang terkait tidak akan ikut terhapus.
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 apple-btn-secondary text-xs cursor-pointer">Batal</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Campaign | null>(null)

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const json = await res.json()
        setCampaigns(json.data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [])

  const openEdit = (e: React.MouseEvent, camp: Campaign) => {
    e.stopPropagation()
    setSelected(camp)
    setModal('edit')
  }

  const openDelete = (e: React.MouseEvent, camp: Campaign) => {
    e.stopPropagation()
    setSelected(camp)
    setModal('delete')
  }

  // Summary stats
  const active    = campaigns.filter(c => c.status === 'ACTIVE').length
  const upcoming  = campaigns.filter(c => c.status === 'UPCOMING').length
  const completed = campaigns.filter(c => c.status === 'COMPLETED').length
  const totalBudget = campaigns.reduce((a, c) => a + (c.budget || 0), 0)

  return (
    <div className="fade-in space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">Campaigns</h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-relaxed">
            Daftar seluruh campaign active, upcoming, dan completed beserta targets SOW.
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="apple-btn-primary bg-[#007AFF] hover:bg-[#0066D6] text-white cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Buat Campaign
        </button>
      </div>

      {/* Summary stats bar */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active', value: active, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30', icon: CheckCircle2 },
            { label: 'Upcoming', value: upcoming, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30', icon: Clock },
            { label: 'Completed', value: completed, color: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700', icon: BarChart3 },
            { label: 'Total Budget', value: `Rp ${(totalBudget/1e6).toFixed(1)}M`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30', icon: DollarSign },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`${s.bg} border rounded-2xl px-4 py-3 flex items-center gap-3`}>
                <Icon className={`h-5 w-5 ${s.color} shrink-0`} />
                <div>
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-[#8E8E93] font-semibold uppercase">{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
          <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Memuat list campaign...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="apple-card p-12 text-center text-zinc-500 font-medium space-y-3">
          <Award className="h-10 w-10 text-zinc-400 mx-auto" />
          <p>Belum ada campaign terdaftar.</p>
          <button onClick={() => setModal('create')} className="apple-btn-primary text-xs mx-auto">
            Buat Campaign Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              onClick={() => { setSelected(camp); setModal('edit') }}
              className="apple-card p-5 space-y-4 flex flex-col justify-between group cursor-pointer hover:shadow-md hover:border-[#007AFF]/30 dark:hover:border-[#007AFF]/30 transition-all duration-150 active:scale-[0.99]"
            >
              <div className="space-y-3.5">
                {/* Title + Status + Actions */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13.5px] font-bold text-[#1D1D1F] dark:text-white truncate group-hover:text-[#007AFF] transition-colors">
                      {camp.name}
                    </h3>
                    {camp.startDate && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#8E8E93]">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(camp.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {camp.endDate && ` → ${new Date(camp.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(camp.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(camp.status)}`} />
                      {camp.status}
                    </span>
                    {/* Quick action buttons — visible on hover */}
                    <button
                      onClick={(e) => openEdit(e, camp)}
                      className="h-6 w-6 rounded-lg bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 flex items-center justify-center text-[#6E6E73] hover:text-[#007AFF] hover:border-[#007AFF]/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Edit Campaign"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => openDelete(e, camp)}
                      className="h-6 w-6 rounded-lg bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 flex items-center justify-center text-[#6E6E73] hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Hapus Campaign"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Budget + Creators */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F5F5F7] dark:bg-zinc-800/60 border border-[#E5E5EA] dark:border-zinc-700 p-2.5 rounded-xl flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#34C759] shrink-0" />
                    <div className="flex flex-col truncate">
                      <span className="text-[9px] text-[#8E8E93] font-bold uppercase select-none tracking-wide">Budget</span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-zinc-200 truncate">
                        Rp {(camp.budget || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#F5F5F7] dark:bg-zinc-800/60 border border-[#E5E5EA] dark:border-zinc-700 p-2.5 rounded-xl flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#007AFF] shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[#8E8E93] font-bold uppercase select-none tracking-wide">Target Creator</span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-zinc-200">{camp.targetCreator}</span>
                    </div>
                  </div>
                </div>

                {/* SOW targets */}
                <div className="border-t border-[#F2F2F7] dark:border-zinc-800/60 pt-3 flex justify-between text-[11px] text-[#8E8E93] font-semibold select-none">
                  <span className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-[#6E6E73]" />
                    {camp.targetVideo} Videos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Tv className="h-3.5 w-3.5 text-[#6E6E73]" />
                    {camp.targetLive} Lives
                  </span>
                </div>
              </div>

              {/* Footer row */}
              <div className="pt-2 border-t border-[#F2F2F7] dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-[#8E8E93] select-none">
                <span className="font-medium">
                  {camp._count?.deals ?? 0} deal · {camp._count?.affiliates ?? 0} creator
                </span>
                <span className="text-[#007AFF] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Klik untuk edit →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && (
        <CampaignModal campaign={null} onClose={() => setModal(null)} onSaved={fetchCampaigns} />
      )}
      {modal === 'edit' && selected && (
        <CampaignModal campaign={selected} onClose={() => { setModal(null); setSelected(null) }} onSaved={fetchCampaigns} />
      )}
      {modal === 'delete' && selected && (
        <DeleteModal campaign={selected} onClose={() => { setModal(null); setSelected(null) }} onDeleted={fetchCampaigns} />
      )}
    </div>
  )
}
