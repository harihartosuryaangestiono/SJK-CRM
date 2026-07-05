'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  Search,
  User,
  Calendar,
  ChevronRight,
  Loader2,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface BlacklistCreator {
  id: string
  username: string
  name: string | null
  followers: string | null
  gmv: string | null
  blacklistDate: string | null
  blacklistReason: string | null
  blacklistNotes: string | null
  pic: { name: string } | null
  campaign: { name: string } | null
}

export default function BlacklistCreatorPage() {
  const [data, setData] = useState<BlacklistCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchBlacklist = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/blacklist')
      if (res.ok) {
        const json = await res.json()
        setData(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlacklist()
  }, [])

  const handleRemoveFromBlacklist = async (id: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin memulihkan creator @${username} dari Blacklist? Status akan diatur kembali ke 'Belum Dihubungi'.`)) {
      return
    }

    try {
      setActioningId(id)
      const res = await fetch(`/api/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Belum Dihubungi',
          blacklistDate: null,
          blacklistReason: null,
          blacklistNotes: null
        })
      })
      if (res.ok) {
        toast.success(`✅ Creator @${username} berhasil dipulihkan dari blacklist!`)
        fetchBlacklist()
      } else {
        toast.error('Gagal memulihkan creator.')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.')
    } finally {
      setActioningId(null)
    }
  }

  // Filter local data
  const filteredData = data.filter(item => 
    item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.blacklistReason && item.blacklistReason.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          Blacklist Creator Database
        </h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Daftar creator yang diblokir otomatis atau manual karena melanggar SOW/Outreach rules.
        </p>
      </div>

      {/* Warning Alert Banner */}
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-[20px] p-4 text-xs text-red-700 dark:text-red-400 leading-relaxed flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
        <div>
          <strong className="block font-semibold">Pemberitahuan Proteksi Database:</strong>
          Sistem secara otomatis memasukkan creator ke daftar ini apabila mereka melebihi batas waktu unggah video SOW (14 hari sejak menerima sampel). Creator yang ada di daftar ini akan memicu peringatan jika diinput kembali.
        </div>
      </div>

      {/* Search Filter Bar */}
      <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xs">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan username, nama, atau alasan blacklist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500/50 text-zinc-900 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] overflow-hidden shadow-2xs">
        <CardHeader className="border-b border-[#F2F2F7] dark:border-[#38383A]/60 pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            Creator Terblokir ({filteredData.length})
          </CardTitle>
          <CardDescription className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Seluruh entri creator dengan status Blacklist aktif
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center p-12 text-zinc-400 text-xs font-semibold">
              Tidak ada creator blacklisted ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F5F7] dark:bg-[#1C1C1E] border-b border-[#E5E5EA] dark:border-[#38383A] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                    <th className="p-4">Creator</th>
                    <th className="p-4">Tanggal Blacklist</th>
                    <th className="p-4">Alasan Utama</th>
                    <th className="p-4">Catatan Detail</th>
                    <th className="p-4">PIC / Campaign</th>
                    <th className="p-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F7] dark:divide-[#38383A]/40">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-red-500/[0.02] dark:hover:bg-red-500/[0.04] transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 font-mono">
                            @{item.username}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{item.name || '-'}</div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {item.blacklistDate 
                          ? new Date(item.blacklistDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'
                        }
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 border border-red-200 text-red-650 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400">
                          {item.blacklistReason || 'Pelanggaran Aturan'}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={item.blacklistNotes || ''}>
                        {item.blacklistNotes || '-'}
                      </td>
                      <td className="p-4 space-y-0.5">
                        <div className="font-medium text-zinc-700 dark:text-zinc-300">PIC: {item.pic?.name || 'Unassigned'}</div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase">{item.campaign?.name || 'None'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRemoveFromBlacklist(item.id, item.username)}
                            disabled={actioningId === item.id}
                            className="flex items-center gap-1 bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#34C759] px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#34C759]/20 transition-all cursor-pointer disabled:opacity-50"
                            title="Pulihkan Creator"
                          >
                            {actioningId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Pulihkan
                          </button>
                          <Link
                            href={`/affiliates/${item.id}`}
                            className="inline-flex items-center justify-center p-1.5 hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-[#007AFF] transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
