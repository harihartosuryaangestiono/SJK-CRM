'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Video,
  Award,
  Users,
  Search,
  Filter,
  User,
  Calendar,
  Flame,
  ChevronRight,
  Loader2,
  DollarSign,
  Play
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface PerformanceItem {
  id: string
  name: string
  username: string
  picName: string
  campaignName: string
  totalVideo: number
  totalGMV: number
  totalOrder: number
  totalCampaign: number
  averageGMV: number
  averageViews: number
  successRate: number
}

export default function CreatorPerformancePage() {
  const [data, setData] = useState<PerformanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [pics, setPics] = useState<Array<{ id: string; name: string }>>([])

  // Filters State
  const [selectedCampaign, setSelectedCampaign] = useState('all')
  const [selectedPic, setSelectedPic] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [usernameSearch, setUsernameSearch] = useState('')

  // Fetch filter options
  const fetchFilterOptions = async () => {
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
      console.error('Failed to load filters', e)
    }
  }

  // Fetch performance data
  const fetchPerformance = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCampaign !== 'all') params.append('campaignId', selectedCampaign)
      if (selectedPic !== 'all') params.append('picId', selectedPic)
      if (selectedMonth !== 'all') params.append('month', selectedMonth)
      if (usernameSearch) params.append('username', usernameSearch)

      const res = await fetch(`/api/performance?${params.toString()}`)
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
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPerformance()
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [selectedCampaign, selectedPic, selectedMonth, usernameSearch])

  // Aggregate stats
  const totalGMV = data.reduce((sum, item) => sum + item.totalGMV, 0)
  const totalVideos = data.reduce((sum, item) => sum + item.totalVideo, 0)
  const avgSuccessRate = data.length > 0 
    ? Math.round(data.reduce((sum, item) => sum + item.successRate, 0) / data.length)
    : 0

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Creator Performance</h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Leaderboard dan statistik kontribusi performa affiliate creator secara realtime.
        </p>
      </div>

      {/* Aggregate Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Revenue GMV</p>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-1 font-mono">
                {formatIDR(totalGMV)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Video Terupload (SOW)</p>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-1 font-mono">
                {totalVideos} Video
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-[#007AFF]">
              <Video className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Avg Success Rate</p>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-1 font-mono">
                {avgSuccessRate}%
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-purple-500">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] shadow-2xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search username */}
            <div className="relative md:col-span-2">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari Username Creator..."
                value={usernameSearch}
                onChange={(e) => setUsernameSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs placeholder-zinc-500 focus:outline-none focus:border-[#007AFF] text-zinc-900 dark:text-white"
              />
            </div>

            {/* Campaign Select */}
            <div className="relative">
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#007AFF] cursor-pointer appearance-none"
              >
                <option value="all">Semua Campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Filter className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* PIC Select */}
            <div className="relative">
              <select
                value={selectedPic}
                onChange={(e) => setSelectedPic(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#007AFF] cursor-pointer appearance-none"
              >
                <option value="all">Semua PIC</option>
                {pics.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <User className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Month Select */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#007AFF] cursor-pointer appearance-none"
              >
                <option value="all">Semua Waktu</option>
                <option value="2026-07">Juli 2026</option>
                <option value="2026-06">Juni 2026</option>
                <option value="2026-05">Mei 2026</option>
              </select>
              <Calendar className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Section */}
      <Card className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] overflow-hidden shadow-2xs">
        <CardHeader className="border-b border-[#F2F2F7] dark:border-[#38383A]/60 pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Flame className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
            Top Creator Leaderboard (SOW Closed Deals)
          </CardTitle>
          <CardDescription className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Daftar creator diurutkan berdasarkan kontribusi nominal GMV closing deals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center p-12 text-zinc-400 text-xs font-semibold">
              Tidak ada data performa ditemukan untuk filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F5F7] dark:bg-[#1C1C1E] border-b border-[#E5E5EA] dark:border-[#38383A] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                    <th className="p-4 w-12 text-center">Rank</th>
                    <th className="p-4">Creator</th>
                    <th className="p-4">PIC / Campaign</th>
                    <th className="p-4 text-center">Video Target / Upload</th>
                    <th className="p-4 text-center">Views Estimasi</th>
                    <th className="p-4 text-center">Total GMV</th>
                    <th className="p-4 text-center">Success Rate</th>
                    <th className="p-4 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F7] dark:divide-[#38383A]/40">
                  {data.map((item, index) => {
                    const rank = index + 1
                    let rankBadge = <span className="font-mono text-[#6E6E73]">{rank}</span>
                    if (rank === 1) rankBadge = <span className="text-lg">🥇</span>
                    if (rank === 2) rankBadge = <span className="text-lg">🥈</span>
                    if (rank === 3) rankBadge = <span className="text-lg">🥉</span>

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-[#323236]/30 transition-colors">
                        <td className="p-4 text-center font-bold">{rankBadge}</td>
                        <td className="p-4">
                          <div>
                            <div className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 font-mono">
                              @{item.username}
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{item.name}</div>
                          </div>
                        </td>
                        <td className="p-4 space-y-0.5">
                          <div className="font-medium text-zinc-700 dark:text-zinc-300">PIC: {item.picName}</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase">{item.campaignName}</div>
                        </td>
                        <td className="p-4 text-center font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {item.totalVideo} Videos
                        </td>
                        <td className="p-4 text-center font-mono font-semibold text-[#007AFF]">
                          {formatNumber(item.averageViews * item.totalVideo)}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-zinc-900 dark:text-white">
                          {formatIDR(item.totalGMV)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 bg-[#F2F2F7] dark:bg-[#1C1C1E] h-1.5 rounded-full overflow-hidden shrink-0">
                              <div 
                                className={`h-full rounded-full ${
                                  item.successRate >= 80 ? 'bg-[#34C759]' : item.successRate >= 50 ? 'bg-[#FF9F0A]' : 'bg-[#FF3B30]'
                                }`} 
                                style={{ width: `${item.successRate}%` }} 
                              />
                            </div>
                            <span className="font-semibold font-mono text-[10px] text-zinc-600 dark:text-zinc-400">{item.successRate}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            href={`/affiliates/${item.id}`}
                            className="inline-flex items-center justify-center p-1.5 hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-[#007AFF] transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
