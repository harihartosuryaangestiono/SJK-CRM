'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  KanbanSquare,
  List,
  Search,
  User,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye
} from 'lucide-react'

// Main pipeline columns for Kanban Board
const KANBAN_COLUMNS = [
  { id: 'Belum Dihubungi', label: 'Prospect', color: 'border-[#E5E5EA] dark:border-[#38383A] bg-[#F5F5F7] dark:bg-[#1E1E1E]/40 text-[#6E6E73] dark:text-[#8E8E93]' },
  { id: 'Sudah Dihubungi', label: 'Contacted', color: 'border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 text-[#007AFF]' },
  { id: 'Follow Up 1', label: 'Follow Up 1', color: 'border-sky-100 dark:border-sky-900/30 bg-sky-50/50 dark:bg-sky-950/10 text-sky-500' },
  { id: 'Follow Up 2', label: 'Follow Up 2', color: 'border-sky-100 dark:border-sky-900/30 bg-sky-50/50 dark:bg-sky-950/10 text-sky-500' },
  { id: 'Negotiation', label: 'Negotiation', color: 'border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/10 text-purple-500' },
  { id: 'Deal', label: 'Deal Closed', color: 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 text-[#34C759]' }
]

const PRIORITY_BADGES: Record<string, string> = {
  HIGH: 'bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border border-amber-500/20',
  LOW: 'bg-zinc-500/10 text-zinc-650 dark:text-zinc-400 border border-zinc-500/20'
}

interface AffiliateCard {
  id: string
  username: string
  name: string | null
  status: string
  priority: string
  followers: string | null
  gmv: string | null
  niche: string | null
  pic: { name: string } | null
}

export default function ProgressPage() {
  const [affiliates, setAffiliates] = useState<AffiliateCard[]>([])
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  const fetchKanbanData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/affiliates/kanban')
      if (res.ok) {
        const json = await res.json()
        setAffiliates(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKanbanData()
  }, [])

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', cardId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (!draggedCardId) return

    // Find the dragged affiliate card
    const card = affiliates.find(a => a.id === draggedCardId)
    if (!card || card.status === targetStatus) {
      setDraggedCardId(null)
      return
    }

    // Optimistically update status locally
    setAffiliates(prev =>
      prev.map(a => (a.id === draggedCardId ? { ...a, status: targetStatus } : a))
    )

    try {
      const res = await fetch(`/api/affiliates/${draggedCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      })

      if (!res.ok) {
        // Rollback on error
        fetchKanbanData()
      }
    } catch (err) {
      console.error('Failed to update status', err)
      fetchKanbanData()
    } finally {
      setDraggedCardId(null)
    }
  }

  // Filter affiliates based on search
  const filteredAffiliates = affiliates.filter(a =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.name && a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Automatic follow-up / re-approach warning alerts
  const checkReminderAlert = (card: AffiliateCard) => {
    if (card.status === 'Sudah Dihubungi') {
      return { type: 'warning', text: '3 hari tanpa respon (Follow up!)' }
    }
    if (card.status === 'Campaign Berjalan') {
      return { type: 'info', text: 'SOW mendekati deadline' }
    }
    return null
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner layout */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">Progress Monitoring</h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed max-w-xl">
            Monitor pipeline status dan kelola alur kerja affiliate creator secara visual menggunakan Kanban.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="bg-[#F5F5F7] dark:bg-zinc-800 p-1 rounded-full border border-[#E5E5EA] dark:border-zinc-700 flex shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-zinc-700 text-[#1D1D1F] dark:text-white shadow-2xs font-bold'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <KanbanSquare className="h-4 w-4" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-700 text-[#1D1D1F] dark:text-white shadow-2xs font-bold'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
              Table View
            </button>
          </div>

          <button
            onClick={fetchKanbanData}
            className="flex items-center justify-center bg-white dark:bg-[#2C2C2E] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white p-2.5 rounded-full active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Filter Panel */}
      <div className="relative max-w-[400px] shadow-2xs">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 pointer-events-none">
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          type="text"
          placeholder="Cari username creator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-full text-xs placeholder-[#6E6E73] dark:placeholder-[#8E8E93] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] text-[#1D1D1F] dark:text-white transition-all shadow-2xs"
        />
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-96 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] animate-pulse" />
            ))}
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-280px)] select-none snap-x">
          {KANBAN_COLUMNS.map((col) => {
            // Get affiliates matching this column status
            const colCards = filteredAffiliates.filter(a => a.status === col.id)
            
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-[285px] shrink-0 bg-[#F5F5F7] dark:bg-[#1C1C1E]/50 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[20px] p-4 flex flex-col justify-between max-h-full snap-start shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                {/* Column header */}
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
                    <span className="text-[12px] font-bold text-[#1D1D1F] dark:text-white truncate">{col.label}</span>
                    <span className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] bg-white dark:bg-zinc-800 px-2 py-0.5 border border-[#E5E5EA] dark:border-zinc-700 rounded-full shadow-2xs">
                      {colCards.length}
                    </span>
                  </div>

                  {/* Column body (scrollable list of cards) */}
                  <div className="overflow-y-auto space-y-3 pr-0.5 max-h-[calc(100vh-420px)] scrollbar-none">
                    {colCards.length === 0 ? (
                      <div className="border border-dashed border-[#E5E5EA] dark:border-[#38383A] rounded-2xl flex items-center justify-center py-12 text-[#8E8E93] dark:text-[#8E8E93] text-[10px] font-semibold text-center leading-relaxed">
                        Tarik card ke kolom ini
                      </div>
                    ) : (
                      colCards.map((card) => {
                        const alert = checkReminderAlert(card)
                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            className="bg-white dark:bg-[#2C2C2E] hover:bg-[#FCFCFD] dark:hover:bg-zinc-800/80 border border-[#E5E5EA] dark:border-[#38383A] rounded-[16px] p-3.5 space-y-3 cursor-grab active:cursor-grabbing transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] relative"
                          >
                            {/* Card Username */}
                            <div className="flex items-center justify-between">
                              <Link href={`/affiliates/${card.id}`} className="font-mono text-xs font-bold text-[#1D1D1F] dark:text-zinc-200 hover:text-[#007AFF] truncate">
                                @{card.username}
                              </Link>
                              
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${PRIORITY_BADGES[card.priority] || PRIORITY_BADGES.LOW}`}>
                                {card.priority}
                              </span>
                            </div>

                            {/* Statistics metadata */}
                            <div className="grid grid-cols-2 gap-1 text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">
                              <div>Foll: <strong className="text-[#1D1D1F] dark:text-white font-semibold">{card.followers || '0'}</strong></div>
                              <div className="text-right">GMV: <strong className="text-[#34C759] font-bold">{card.gmv || '0'}</strong></div>
                            </div>

                            {/* PIC indicator */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E5EA] dark:border-[#38383A]/60 text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">
                              <span className="truncate max-w-[120px] font-medium">{card.niche || 'Food'}</span>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-zinc-400" />
                                <span className="truncate max-w-[80px] font-bold text-[#1D1D1F] dark:text-white">{card.pic?.name.split(' ')[0] || 'Unassigned'}</span>
                              </div>
                            </div>

                            {/* Alert banners */}
                            {alert && (
                              <div className={`flex items-center gap-1.5 p-2 rounded-xl border text-[9px] font-semibold leading-relaxed ${
                                alert.type === 'critical'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                                  : alert.type === 'warning'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-blue-500/10 border-blue-500/20 text-[#007AFF] dark:text-blue-400'
                              }`}>
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {alert.text}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE GRID VIEW */
        <div className="apple-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 bg-[#F5F5F7] dark:bg-[#1E1E1E]/40 text-[#6E6E73] dark:text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider select-none">
                  <th className="py-4 px-4">TikTok Creator</th>
                  <th className="py-4 px-4">Followers</th>
                  <th className="py-4 px-4">GMV L30D</th>
                  <th className="py-4 px-4">PIC</th>
                  <th className="py-4 px-4">Pipeline Status</th>
                  <th className="py-4 px-4">Saran Tindakan</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]/60 text-xs">
                {filteredAffiliates.map((item) => {
                  const alert = checkReminderAlert(item)
                  return (
                    <tr key={item.id} className="hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/30 border-b border-[#E5E5EA] dark:border-[#38383A]/60 last:border-0 transition-colors">
                      <td className="py-4 px-4 font-semibold text-[#1D1D1F] dark:text-white">
                        <Link href={`/affiliates/${item.id}`} className="hover:text-[#007AFF] transition-colors font-mono">
                          @{item.username}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-[#6E6E73] dark:text-[#8E8E93]">{item.followers || '0'}</td>
                      <td className="py-4 px-4 text-[#34C759] font-bold">{item.gmv || '0'}</td>
                      <td className="py-4 px-4 text-[#6E6E73] dark:text-[#8E8E93]">{item.pic?.name || 'Unassigned'}</td>
                      <td className="py-4 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => {
                            setAffiliates(prev => prev.map(a => a.id === item.id ? { ...a, status: e.target.value } : a))
                            fetch(`/api/affiliates/${item.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: e.target.value })
                            })
                          }}
                          className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-xs text-[#1D1D1F] dark:text-white p-2 rounded-full focus:outline-none cursor-pointer hover:border-zinc-350 transition-colors shadow-2xs"
                        >
                          {KANBAN_COLUMNS.map(col => (
                            <option key={col.id} value={col.id}>{col.id}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        {alert ? (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                            alert.type === 'critical'
                              ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                              : alert.type === 'warning'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-500/10 border-blue-500/20 text-[#007AFF] dark:text-blue-400'
                          }`}>
                            {alert.text}
                          </span>
                        ) : (
                          <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[10px] font-medium">Aman</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/affiliates/${item.id}`}
                          className="bg-white dark:bg-[#2C2C2E] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-xs font-bold text-[#007AFF] px-4 py-2 rounded-full active:scale-[0.98] transition-all inline-block shadow-2xs"
                        >
                          Detail Profil
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
