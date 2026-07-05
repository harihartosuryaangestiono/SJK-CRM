'use client'

import React, { useEffect, useState } from 'react'
import { Trash2, RotateCcw, AlertCircle, Database, Award, Handshake, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type DeletedAffiliate = {
  id: string
  username: string
  name: string | null
  status: string
  deletedAt: string
  deletedBy: string | null
}

type DeletedCampaign = {
  id: string
  name: string
  status: string
  deletedAt: string
  deletedBy: string | null
}

type DeletedDeal = {
  id: string
  nominal: number
  product: string
  deletedAt: string
  deletedBy: string | null
  affiliate: { username: string }
  campaign: { name: string }
}

type TrashData = {
  affiliates: DeletedAffiliate[]
  campaigns: DeletedCampaign[]
  deals: DeletedDeal[]
}

export default function TrashPage() {
  const [data, setData] = useState<TrashData>({ affiliates: [], campaigns: [], deals: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'affiliates' | 'campaigns' | 'deals'>('affiliates')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchTrash = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/trash')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        toast.error(json.message || 'Failed to fetch trash bin')
      }
    } catch (err: any) {
      toast.error('Network error fetching trash')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrash()
  }, [])

  const handleRestore = async (type: 'affiliate' | 'campaign' | 'deal', id: string) => {
    try {
      setActionLoadingId(id)
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || 'Restored successfully')
        fetchTrash()
      } else {
        toast.error(json.message || 'Failed to restore')
      }
    } catch (err) {
      toast.error('Network error during restoration')
    } finally {
      setActionLoadingId(null)
    }
  }

  const formatIndonesianDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E]/60 pb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-2.5">
            <Trash2 className="h-6 w-6 text-[#8E8E93]" />
            Tong Sampah (Trash)
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-relaxed">
            Pulihkan data affiliate, campaign, atau deals yang sudah dihapus sebelumnya.
          </p>
        </div>
      </div>

      {/* Tabs Switcher — iOS Segmented Control */}
      <div className="bg-[#E5E5EA] dark:bg-[#1E1E1F] p-0.5 rounded-xl flex flex-wrap gap-0.5 w-max max-w-full">
        <button
          onClick={() => setActiveTab('affiliates')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-all ${
            activeTab === 'affiliates'
              ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-bold'
              : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-white/40 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Database className="h-4 w-4" />
          Creators ({data.affiliates.length})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-all ${
            activeTab === 'campaigns'
              ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-bold'
              : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-white/40 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Award className="h-4 w-4" />
          Campaigns ({data.campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('deals')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-all ${
            activeTab === 'deals'
              ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-bold'
              : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-white/40 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Handshake className="h-4 w-4" />
          Deals ({data.deals.length})
        </button>
      </div>

      {/* Grid Content */}
      <div className="apple-card p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
            <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Memuat data sampah...</p>
          </div>
        ) : (
          <>
            {activeTab === 'affiliates' && (
              <div className="overflow-x-auto">
                {data.affiliates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="h-10 w-10 text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500 font-medium">Tidak ada creator di tong sampah</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-[#6E6E73] dark:text-[#8E8E93] font-semibold select-none">
                        <th className="pb-3 pr-4">Username</th>
                        <th className="pb-3 pr-4">Nama</th>
                        <th className="pb-3 pr-4">Status Terakhir</th>
                        <th className="pb-3 pr-4">Dihapus Pada</th>
                        <th className="pb-3 pr-4">Dihapus Oleh</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.affiliates.map((aff) => (
                        <tr key={aff.id} className="border-b border-[#F2F2F7] dark:border-zinc-800/40 hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/20 group">
                          <td className="py-4 pr-4 font-mono text-[#1D1D1F] dark:text-white font-bold">@{aff.username}</td>
                          <td className="py-4 pr-4 text-[#1D1D1F] dark:text-zinc-200">{aff.name || '-'}</td>
                          <td className="py-4 pr-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-[#F5F5F7] dark:bg-zinc-800 border-[#E5E5EA] dark:border-zinc-700 text-[#6E6E73] dark:text-zinc-300">
                              {aff.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{formatIndonesianDate(aff.deletedAt)}</td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{aff.deletedBy || 'System'}</td>
                          <td className="py-4 text-right">
                            <button
                              disabled={actionLoadingId === aff.id}
                              onClick={() => handleRestore('affiliate', aff.id)}
                              className="apple-btn-secondary h-8 text-[11px] px-3 gap-1.5 shadow-2xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {actionLoadingId === aff.id ? 'Memulihkan...' : 'Pulihkan'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="overflow-x-auto">
                {data.campaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="h-10 w-10 text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500 font-medium">Tidak ada campaign di tong sampah</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-[#6E6E73] dark:text-[#8E8E93] font-semibold select-none">
                        <th className="pb-3 pr-4">Nama Campaign</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Dihapus Pada</th>
                        <th className="pb-3 pr-4">Dihapus Oleh</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.map((cam) => (
                        <tr key={cam.id} className="border-b border-[#F2F2F7] dark:border-zinc-800/40 hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/20 group">
                          <td className="py-4 pr-4 text-[#1D1D1F] dark:text-white font-bold">{cam.name}</td>
                          <td className="py-4 pr-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-[#F5F5F7] dark:bg-zinc-800 border-[#E5E5EA] dark:border-zinc-700 text-[#6E6E73] dark:text-zinc-300">
                              {cam.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{formatIndonesianDate(cam.deletedAt)}</td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{cam.deletedBy || 'System'}</td>
                          <td className="py-4 text-right">
                            <button
                              disabled={actionLoadingId === cam.id}
                              onClick={() => handleRestore('campaign', cam.id)}
                              className="apple-btn-secondary h-8 text-[11px] px-3 gap-1.5 shadow-2xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {actionLoadingId === cam.id ? 'Memulihkan...' : 'Pulihkan'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'deals' && (
              <div className="overflow-x-auto">
                {data.deals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="h-10 w-10 text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500 font-medium">Tidak ada deal di tong sampah</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-[#6E6E73] dark:text-[#8E8E93] font-semibold select-none">
                        <th className="pb-3 pr-4">Creator</th>
                        <th className="pb-3 pr-4">Campaign</th>
                        <th className="pb-3 pr-4">Nominal</th>
                        <th className="pb-3 pr-4">Produk</th>
                        <th className="pb-3 pr-4">Dihapus Pada</th>
                        <th className="pb-3 pr-4">Dihapus Oleh</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deals.map((deal) => (
                        <tr key={deal.id} className="border-b border-[#F2F2F7] dark:border-zinc-800/40 hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/20 group">
                          <td className="py-4 pr-4 font-mono text-[#1D1D1F] dark:text-white font-bold">@{deal.affiliate.username}</td>
                          <td className="py-4 pr-4 text-[#1D1D1F] dark:text-zinc-200">{deal.campaign.name}</td>
                          <td className="py-4 pr-4 text-[#1D1D1F] dark:text-white font-bold">
                            Rp {deal.nominal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{deal.product}</td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{formatIndonesianDate(deal.deletedAt)}</td>
                          <td className="py-4 pr-4 text-[#6E6E73] dark:text-zinc-400">{deal.deletedBy || 'System'}</td>
                          <td className="py-4 text-right">
                            <button
                              disabled={actionLoadingId === deal.id}
                              onClick={() => handleRestore('deal', deal.id)}
                              className="apple-btn-secondary h-8 text-[11px] px-3 gap-1.5 shadow-2xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {actionLoadingId === deal.id ? 'Memulihkan...' : 'Pulihkan'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
