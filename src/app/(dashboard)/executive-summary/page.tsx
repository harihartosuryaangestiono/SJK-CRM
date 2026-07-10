'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  User,
  Clock,
  Briefcase,
  AlertCircle,
  ShieldAlert,
  Loader2,
  FileText,
  UserCheck,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { toast } from 'sonner'

type KPICardProps = {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down'
  desc: string
  color: string
  sparklineData: { value: number }[]
}

function Sparkline({ data, color }: { data: { value: number }[], color: string }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function KPICard({ title, value, change, trend, desc, color, sparklineData }: KPICardProps) {
  const isPositive = change >= 0
  return (
    <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-5 flex flex-col justify-between min-h-[140px] shadow-2xs hover:shadow-xs transition-all duration-300">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold text-[#8E8E93] dark:text-[#8E8E93] uppercase tracking-wider">{title}</span>
        <Sparkline data={sparklineData} color={color} />
      </div>
      <div className="mt-2.5">
        <div className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-none">
          {value}
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`inline-flex items-center text-[10.5px] font-bold ${isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-[10px] text-[#8E8E93] font-medium truncate">{desc}</span>
        </div>
      </div>
    </div>
  )
}

export default function ExecutiveSummaryPage() {
  const [range, setRange] = useState<string>('this_month')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [picId, setPicId] = useState<string>('')
  
  const [pics, setPics] = useState<{ id: string; name: string }[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Sub-tabs for Bottom lists
  const [activeBottomTab, setActiveBottomTab] = useState<'followUp' | 'noResponse' | 'overdueSow' | 'noVideo' | 'blacklist'>('followUp')

  // Fetch PIC dropdown list (only for managers/admin)
  const fetchPics = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const json = await res.json()
        if (json.success) setPics(json.data || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      const url = new URL('/api/executive-summary', window.location.origin)
      url.searchParams.set('range', range)
      if (range === 'custom' && startDate && endDate) {
        url.searchParams.set('startDate', startDate)
        url.searchParams.set('endDate', endDate)
      }
      if (picId) {
        url.searchParams.set('picId', picId)
      }

      const res = await fetch(url.toString())
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData(json)
        }
      }
    } catch (e) {
      toast.error('Gagal memuat data Executive Summary')
    } finally {
      setLoading(false)
    }
  }

  const fetchAiSummary = async () => {
    try {
      setAiLoading(true)
      const url = new URL('/api/executive-summary/ai-summary', window.location.origin)
      url.searchParams.set('range', range)
      if (range === 'custom' && startDate && endDate) {
        url.searchParams.set('startDate', startDate)
        url.searchParams.set('endDate', endDate)
      }
      if (picId) {
        url.searchParams.set('picId', picId)
      }

      const res = await fetch(url.toString())
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setAiSummary(json)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    fetchPics()
  }, [])

  useEffect(() => {
    fetchSummaryData()
    fetchAiSummary()
  }, [range, startDate, endDate, picId])

  // Sparkline data mock generators mapped to actual totals
  const generateSparkline = (total: number, change: number) => {
    const points = 7
    const base = total / 2
    const step = (total - base) / points
    const dataPoints = []
    for (let i = 0; i < points; i++) {
      const noise = Math.sin(i) * (base * 0.1)
      dataPoints.push({ value: Math.max(0, Math.round(base + (i * step) + noise)) })
    }
    return dataPoints
  }

  // Filtered leaderboard / top list search
  const filteredLeaderboard = useMemo(() => {
    if (!data || !data.leaderboard) return []
    return data.leaderboard.filter((u: any) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [data, searchQuery])

  // Export CSV
  const handleExportCSV = () => {
    if (!data || !data.summaryTable) return
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Metrics,Total,' + data.summaryTable.map((t: any) => t.label).join(',') + '\n'

    const rows = [
      { key: 'contactsWa', label: 'Contact WA' },
      { key: 'contactsDm', label: 'Contact Instagram' },
      { key: 'contactsTiktok', label: 'Contact TikTok' },
      { key: 'followUp1', label: 'Follow Up 1' },
      { key: 'followUp2', label: 'Follow Up 2' },
      { key: 'noResponse', label: 'No Response' },
      { key: 'reject', label: 'Reject' },
      { key: 'join', label: 'Join' },
      { key: 'deal', label: 'Deal' },
      { key: 'sampleSent', label: 'Sample Sent' },
      { key: 'videoUploaded', label: 'Video Uploaded' },
      { key: 'sowComplete', label: 'SOW Complete' },
      { key: 'blacklist', label: 'Blacklist' }
    ]

    rows.forEach(r => {
      const intervalValues = data.summaryTable.map((t: any) => t[r.key]).join(',')
      const total = data.summaryTable.reduce((sum: number, t: any) => sum + (t[r.key] || 0), 0)
      csvContent += `"${r.label}",${total},${intervalValues}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Executive_Summary_${range}_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
        <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Menghasilkan Laporan Eksekutif...</p>
      </div>
    )
  }

  const s = data.stats
  const showPicFilter = data.user?.isManagerOrAdmin

  return (
    <div className="space-y-8 max-w-[1250px] mx-auto pb-16 print:p-0 print:bg-white print:text-zinc-950">
      {/* Top Header & Export controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-[#E5E5EA] dark:border-[#38383A]/60 print:hidden">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.12em]">Enterprise Business Intelligence</span>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">Executive Summary</h1>
          <p className="text-[12.5px] text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed max-w-xl">
            Laporan analitik CRM real-time untuk memantau performa marketing, konversi funnel, pencapaian SOW, dan proyeksi omzet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-[#2C2C2E] hover:bg-[#F2F2F7] dark:hover:bg-[#38383A] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#007AFF] hover:bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> Print Report
          </button>
        </div>
      </div>

      {/* Dynamic Filters Section */}
      <div className="bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-5 shadow-2xs flex flex-wrap items-center justify-between gap-5 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F2F2F7] dark:bg-[#1E1E1F] rounded-xl text-[#8E8E93]">
            <Filter className="h-4 w-4" />
          </div>
          <div className="flex flex-wrap bg-[#F2F2F7] dark:bg-[#1E1E1F] p-0.5 rounded-full border border-[#E5E5EA]/40 dark:border-[#38383A]/40">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'this_week', label: 'Minggu Ini' },
              { id: 'last_week', label: 'Minggu Lalu' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'last_month', label: 'Bulan Lalu' },
              { id: 'custom', label: 'Custom Date' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setRange(t.id)}
                className={`px-3 py-1.5 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                  range === t.id
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-2xs font-extrabold'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          {range === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-semibold p-2 rounded-xl focus:outline-none text-[#1D1D1F] dark:text-white cursor-pointer"
              />
              <span className="text-xs text-[#8E8E93] font-bold">sampai</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-semibold p-2 rounded-xl focus:outline-none text-[#1D1D1F] dark:text-white cursor-pointer"
              />
            </div>
          )}

          {showPicFilter && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">PIC Scope:</span>
              <div className="relative">
                <select
                  value={picId}
                  onChange={e => setPicId(e.target.value)}
                  className="appearance-none bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-bold rounded-xl pl-4 pr-9 py-2 focus:outline-none cursor-pointer text-[#1D1D1F] dark:text-white shadow-2xs"
                >
                  <option value="">Semua User (Global)</option>
                  {pics.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Performance Insights Summary */}
      <div className="bg-gradient-to-tr from-[#007AFF]/8 to-transparent dark:from-[#007AFF]/15 dark:to-transparent border border-[#007AFF]/15 dark:border-[#007AFF]/20 rounded-[28px] p-6 relative overflow-hidden shadow-2xs">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="p-2 bg-[#007AFF]/15 text-[#007AFF] rounded-xl">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-[#007AFF] dark:text-[#4DB8FF] uppercase tracking-wider">
            AI Executive Copilot Summary
          </h3>
        </div>
        
        <div className="text-xs text-[#1D1D1F] dark:text-zinc-200">
          {aiLoading ? (
            <div className="flex items-center gap-2 text-[#8E8E93]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Gemini sedang menyusun analisis eksekutif real-time...</span>
            </div>
          ) : aiSummary ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold leading-relaxed text-[#1D1D1F] dark:text-white">
                {aiSummary.summary}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-[#F5F5F7]/60 dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-[#007AFF] uppercase block mb-1">Key Insight</span>
                  <p className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                    {aiSummary.insight}
                  </p>
                </div>
                <div className="bg-[#F5F5F7]/60 dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-[#34C759] uppercase block mb-1">Strategic Recommendation</span>
                  <p className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                    {aiSummary.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[#8E8E93]">AI summary tidak tersedia saat ini.</p>
          )}
        </div>
      </div>

      {/* KPI Dashboard Cards Grid */}
      <div className="space-y-3.5">
        <h2 className="text-[11px] font-bold tracking-wider text-[#8E8E93] uppercase select-none">Top KPI Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Contacted"
            value={s.totalContacted?.total || 0}
            change={s.totalContacted?.change || 0}
            trend={s.totalContacted?.change >= 0 ? 'up' : 'down'}
            desc="Outreach Terkirim"
            color="#007AFF"
            sparklineData={generateSparkline(s.totalContacted?.total, s.totalContacted?.change)}
          />
          <KPICard
            title="WhatsApp Contacts"
            value={s.waContacts?.total || 0}
            change={s.waContacts?.change || 0}
            trend={s.waContacts?.change >= 0 ? 'up' : 'down'}
            desc="Outreach via WA"
            color="#34C759"
            sparklineData={generateSparkline(s.waContacts?.total, s.waContacts?.change)}
          />
          <KPICard
            title="TikTok Contacts"
            value={s.tiktokContacts?.total || 0}
            change={s.tiktokContacts?.change || 0}
            trend={s.tiktokContacts?.change >= 0 ? 'up' : 'down'}
            desc="Outreach via TikTok"
            color="#FF3B30"
            sparklineData={generateSparkline(s.tiktokContacts?.total, s.tiktokContacts?.change)}
          />
          <KPICard
            title="Instagram Contacts"
            value={s.instagramContacts?.total || 0}
            change={s.instagramContacts?.change || 0}
            trend={s.instagramContacts?.change >= 0 ? 'up' : 'down'}
            desc="Outreach via IG"
            color="#BF5AF2"
            sparklineData={generateSparkline(s.instagramContacts?.total, s.instagramContacts?.change)}
          />
          <KPICard
            title="Follow Up 1"
            value={s.followUp1?.total || 0}
            change={s.followUp1?.change || 0}
            trend={s.followUp1?.change >= 0 ? 'up' : 'down'}
            desc="Creator FU Tahap 1"
            color="#FF9F0A"
            sparklineData={generateSparkline(s.followUp1?.total, s.followUp1?.change)}
          />
          <KPICard
            title="Follow Up 2"
            value={s.followUp2?.total || 0}
            change={s.followUp2?.change || 0}
            trend={s.followUp2?.change >= 0 ? 'up' : 'down'}
            desc="Creator FU Tahap 2"
            color="#FF9F0A"
            sparklineData={generateSparkline(s.followUp2?.total, s.followUp2?.change)}
          />
          <KPICard
            title="No Response"
            value={s.noResponse?.total || 0}
            change={s.noResponse?.change || 0}
            trend={s.noResponse?.change <= 0 ? 'up' : 'down'}
            desc="Outreach Tanpa Respon"
            color="#8E8E93"
            sparklineData={generateSparkline(s.noResponse?.total, s.noResponse?.change)}
          />
          <KPICard
            title="Rejected Prospects"
            value={s.rejected?.total || 0}
            change={s.rejected?.change || 0}
            trend={s.rejected?.change <= 0 ? 'up' : 'down'}
            desc="Negosiasi Gagal"
            color="#FF3B30"
            sparklineData={generateSparkline(s.rejected?.total, s.rejected?.change)}
          />
          <KPICard
            title="Joined Affiliate"
            value={s.joined?.total || 0}
            change={s.joined?.change || 0}
            trend={s.joined?.change >= 0 ? 'up' : 'down'}
            desc="Creator Masuk Deal"
            color="#34C759"
            sparklineData={generateSparkline(s.joined?.total, s.joined?.change)}
          />
          <KPICard
            title="Total SOW Deals"
            value={s.totalDeals?.total || 0}
            change={s.totalDeals?.change || 0}
            trend={s.totalDeals?.change >= 0 ? 'up' : 'down'}
            desc="SOW Terdaftar"
            color="#007AFF"
            sparklineData={generateSparkline(s.totalDeals?.total, s.totalDeals?.change)}
          />
          <KPICard
            title="Active SOW"
            value={s.activeSow?.total || 0}
            change={s.activeSow?.change || 0}
            trend={s.activeSow?.change >= 0 ? 'up' : 'down'}
            desc="SOW Dalam Pengerjaan"
            color="#007AFF"
            sparklineData={generateSparkline(s.activeSow?.total, s.activeSow?.change)}
          />
          <KPICard
            title="Completed SOW"
            value={s.completedSow?.total || 0}
            change={s.completedSow?.change || 0}
            trend={s.completedSow?.change >= 0 ? 'up' : 'down'}
            desc="SOW Selesai Diupload"
            color="#34C759"
            sparklineData={generateSparkline(s.completedSow?.total, s.completedSow?.change)}
          />
          <KPICard
            title="Blacklisted"
            value={s.blacklisted?.total || 0}
            change={s.blacklisted?.change || 0}
            trend={s.blacklisted?.change <= 0 ? 'up' : 'down'}
            desc="Akun Blacklist Baru"
            color="#FF3B30"
            sparklineData={generateSparkline(s.blacklisted?.total, s.blacklisted?.change)}
          />
          <KPICard
            title="Videos Uploaded"
            value={s.videoUploaded?.total || 0}
            change={s.videoUploaded?.change || 0}
            trend={s.videoUploaded?.change >= 0 ? 'up' : 'down'}
            desc="Total Konten Terposting"
            color="#34C759"
            sparklineData={generateSparkline(s.videoUploaded?.total, s.videoUploaded?.change)}
          />
          <KPICard
            title="Joined GMV"
            value={`Rp ${(s.gmv?.total || 0).toLocaleString('id-ID')}`}
            change={s.gmv?.change || 0}
            trend={s.gmv?.change >= 0 ? 'up' : 'down'}
            desc="Estimasi GMV Creator"
            color="#34C759"
            sparklineData={generateSparkline(s.gmv?.total, s.gmv?.change)}
          />
          <KPICard
            title="SOW Revenue"
            value={`Rp ${(s.revenue?.total || 0).toLocaleString('id-ID')}`}
            change={s.revenue?.change || 0}
            trend={s.revenue?.change >= 0 ? 'up' : 'down'}
            desc="Total Kontrak SOW"
            color="#007AFF"
            sparklineData={generateSparkline(s.revenue?.total, s.revenue?.change)}
          />
          <KPICard
            title="PIC Commission"
            value={`Rp ${(s.commission?.total || 0).toLocaleString('id-ID')}`}
            change={s.commission?.change || 0}
            trend={s.commission?.change >= 0 ? 'up' : 'down'}
            desc="Insentif PIC (10% Kontrak)"
            color="#34C759"
            sparklineData={generateSparkline(s.commission?.total, s.commission?.change)}
          />
          <KPICard
            title="Join Rate"
            value={`${(s.joinRate?.total || 0).toFixed(1)}%`}
            change={s.joinRate?.change || 0}
            trend={s.joinRate?.change >= 0 ? 'up' : 'down'}
            desc="Rasio Hubungi ke Deal"
            color="#007AFF"
            sparklineData={generateSparkline(s.joinRate?.total, s.joinRate?.change)}
          />
          <KPICard
            title="Deal Conversion"
            value={`${(s.dealRate?.total || 0).toFixed(1)}%`}
            change={s.dealRate?.change || 0}
            trend={s.dealRate?.change >= 0 ? 'up' : 'down'}
            desc="Outreach Berhasil Kontrak"
            color="#34C759"
            sparklineData={generateSparkline(s.dealRate?.total, s.dealRate?.change)}
          />
          <KPICard
            title="Response Rate"
            value={`${(s.responseRate?.total || 0).toFixed(1)}%`}
            change={s.responseRate?.change || 0}
            trend={s.responseRate?.change >= 0 ? 'up' : 'down'}
            desc="Rasio Respon Kontak"
            color="#007AFF"
            sparklineData={generateSparkline(s.responseRate?.total, s.responseRate?.change)}
          />
        </div>
      </div>

      {/* Summary Table Section */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 mb-5">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Summary Report Table</h3>
            <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Tabel visualisasi data berdasarkan interval waktu yang difilter</p>
          </div>
          <span className="text-[9px] font-bold bg-[#F2F2F7] dark:bg-[#1E1E1F] text-[#8E8E93] px-2.5 py-1 rounded-full uppercase">Realtime Database</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 text-[#8E8E93] font-bold uppercase text-[9px] tracking-wider">
                <th className="pb-3 pr-4">Metrics Activity</th>
                {data.summaryTable.map((col: any) => (
                  <th key={col.label} className="pb-3 text-center px-3 min-w-[75px]">{col.label}</th>
                ))}
                <th className="pb-3 text-right pl-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7] dark:divide-[#38383A]/40 text-[#1D1D1F] dark:text-zinc-200">
              {[
                { key: 'contactsWa', label: 'Contact WA' },
                { key: 'contactsDm', label: 'Contact Instagram (DM)' },
                { key: 'contactsTiktok', label: 'Contact TikTok' },
                { key: 'followUp1', label: 'Follow Up 1' },
                { key: 'followUp2', label: 'Follow Up 2' },
                { key: 'noResponse', label: 'No Response' },
                { key: 'reject', label: 'Reject' },
                { key: 'join', label: 'Join' },
                { key: 'deal', label: 'Deal Signed' },
                { key: 'sampleSent', label: 'Sample Sent' },
                { key: 'videoUploaded', label: 'Video Uploaded' },
                { key: 'sowComplete', label: 'SOW Complete' },
                { key: 'blacklist', label: 'Blacklisted' }
              ].map(r => {
                const total = data.summaryTable.reduce((sum: number, col: any) => sum + (col[r.key] || 0), 0)
                return (
                  <tr key={r.key} className="hover:bg-[#F5F5F7]/30 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="py-3 font-semibold text-[#1D1D1F] dark:text-white pr-4">{r.label}</td>
                    {data.summaryTable.map((col: any) => (
                      <td key={col.label} className="py-3 text-center px-3 font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                        {col[r.key]}
                      </td>
                    ))}
                    <td className="py-3 text-right font-bold text-[#007AFF] pl-4">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Leaderboard Performance Table */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 mb-5 gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Marketing Leaderboard Performa PIC</h3>
            <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Peringkat kinerja staff marketing / PIC CRM</p>
          </div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Cari PIC..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#F5F5F7] dark:bg-[#1E1E1F] border border-[#E5E5EA] dark:border-[#38383A] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none w-52 shadow-2xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredLeaderboard.length === 0 ? (
            <p className="text-center text-xs text-[#8E8E93] py-8">Tidak ada data marketing PIC ditemukan</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 text-[#8E8E93] font-bold uppercase text-[9px] tracking-wider">
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">Nama User</th>
                  <th className="pb-3 text-center">Contacts</th>
                  <th className="pb-3 text-center">Response</th>
                  <th className="pb-3 text-center">Join</th>
                  <th className="pb-3 text-center">Deals</th>
                  <th className="pb-3 text-center">Reject</th>
                  <th className="pb-3 text-center">No Response</th>
                  <th className="pb-3 text-right">GMV Joined</th>
                  <th className="pb-3 text-right">SOW Revenue</th>
                  <th className="pb-3 text-right">Commission (10%)</th>
                  <th className="pb-3 text-right pl-4">SOW Complete Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7] dark:divide-[#38383A]/40">
                {filteredLeaderboard.map((u: any, idx: number) => {
                  const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`
                  return (
                    <tr key={u.name} className="hover:bg-[#F5F5F7]/30 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="py-3 font-bold text-base text-center pr-3">{rankBadge}</td>
                      <td className="py-3">
                        <span className="font-semibold text-[#1D1D1F] dark:text-white block">{u.name}</span>
                        <span className="text-[10px] text-[#8E8E93] uppercase font-bold">{u.role}</span>
                      </td>
                      <td className="py-3 text-center font-bold text-[#6E6E73] dark:text-[#8E8E93]">{u.totalContact}</td>
                      <td className="py-3 text-center font-semibold text-[#34C759]">{u.totalResponse}</td>
                      <td className="py-3 text-center font-semibold">{u.join}</td>
                      <td className="py-3 text-center font-bold text-[#007AFF]">{u.deals}</td>
                      <td className="py-3 text-center text-[#FF3B30]">{u.reject}</td>
                      <td className="py-3 text-center text-[#8E8E93]">{u.noResponse}</td>
                      <td className="py-3 text-right font-bold text-[#34C759]">Rp {u.gmv.toLocaleString('id-ID')}</td>
                      <td className="py-3 text-right font-bold">Rp {u.revenue.toLocaleString('id-ID')}</td>
                      <td className="py-3 text-right font-bold text-[#FF9F0A]">Rp {u.commission.toLocaleString('id-ID')}</td>
                      <td className="py-3 text-right font-black text-[#007AFF] pl-4">{u.completionRate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Analytics Trend Charts */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
        <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white mb-6">CRM Activity & Financial Trends</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[260px] border border-[#E5E5EA]/50 dark:border-[#38383A]/50 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-[#8E8E93] uppercase mb-4">Outreach & Conversion (Deals vs Contacts)</h4>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={data.trends}>
                <XAxis dataKey="name" stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '16px',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="contact" stroke="#007AFF" strokeWidth={2} fill="#007AFF" fillOpacity={0.06} name="Contacts" />
                <Area type="monotone" dataKey="deal" stroke="#34C759" strokeWidth={2} fill="#34C759" fillOpacity={0.06} name="Deals" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[260px] border border-[#E5E5EA]/50 dark:border-[#38383A]/50 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-[#8E8E93] uppercase mb-4">Financial Projections (Revenue & GMV in Juta)</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={data.trends}>
                <XAxis dataKey="name" stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '16px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="revenue" fill="#007AFF" radius={[4, 4, 0, 0]} name="Revenue SOW" />
                <Bar dataKey="commission" fill="#FF9F0A" radius={[4, 4, 0, 0]} name="Commission insentif" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Creators */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
          <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3.5 mb-4">
            Top 10 Affiliate Creator (by GMV)
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {data.topCreators.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Belum ada creator deal terdaftar</p>
            ) : (
              data.topCreators.map((c: any, idx: number) => (
                <div key={c.username} className="flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-[#1E1E1F]/50 rounded-xl border border-[#E5E5EA]/40 dark:border-[#38383A]/40">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#8E8E93] w-5 text-center">#{idx + 1}</span>
                    <div>
                      <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">@{c.username}</span>
                      <span className="text-[10px] text-[#8E8E93] block">{c.name || 'No Name'} • {c.followers || '0'} followers</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#34C759]">{c.gmv || 'Rp 0'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
          <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3.5 mb-4">
            Top Campaigns (by Deal Revenue)
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {data.topCampaigns.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Belum ada campaign terdaftar</p>
            ) : (
              data.topCampaigns.map((camp: any, idx: number) => (
                <div key={camp.name} className="flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-[#1E1E1F]/50 rounded-xl border border-[#E5E5EA]/40 dark:border-[#38383A]/40">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#8E8E93] w-5 text-center">#{idx + 1}</span>
                    <div>
                      <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">{camp.name}</span>
                      <span className="text-[10px] text-[#8E8E93] block">{camp.deals} Deals Terdaftar</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#007AFF]">Rp {camp.revenue.toLocaleString('id-ID')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Lists & Warnings (Tabbed for efficiency and neat layout) */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 mb-5 gap-3">
          <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Bottom Attention & Action List</h3>
          <div className="flex bg-[#F2F2F7] dark:bg-[#1E1E1F] p-0.5 rounded-full border border-[#E5E5EA]/40 dark:border-[#38383A]/40">
            {[
              { id: 'followUp', label: 'Perlu FU' },
              { id: 'noResponse', label: 'No Response' },
              { id: 'overdueSow', label: 'Overdue SOW' },
              { id: 'noVideo', label: 'Belum Upload Video' },
              { id: 'blacklist', label: 'Blacklisted' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveBottomTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  activeBottomTab === tab.id
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-2xs font-extrabold'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
          {activeBottomTab === 'followUp' && (
            data.bottomLists.needFollowUp.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Semua aman, tidak ada creator perlu follow up</p>
            ) : (
              data.bottomLists.needFollowUp.map((a: any) => (
                <div key={a.username} className="flex items-center justify-between p-3 bg-red-50/20 dark:bg-red-950/5 border border-red-200/20 dark:border-red-900/10 rounded-xl">
                  <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">@{a.username}</span>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF9F0A]/10 text-[#FF9F0A] border border-[#FF9F0A]/20">{a.status}</span>
                    <span className="text-[10px] text-[#8E8E93] font-semibold">Kontak Terakhir: {a.lastContactDate ? new Date(a.lastContactDate).toLocaleDateString('id-ID') : '-'}</span>
                  </div>
                </div>
              ))
            )
          )}

          {activeBottomTab === 'noResponse' && (
            data.bottomLists.noResponse.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Tidak ada creator dengan status no response</p>
            ) : (
              data.bottomLists.noResponse.map((a: any) => (
                <div key={a.username} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/10 border border-zinc-200/20 dark:border-zinc-800/20 rounded-xl">
                  <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">@{a.username}</span>
                  <span className="text-[10px] text-[#8E8E93] font-semibold">Status Diupdate: {new Date(a.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
              ))
            )
          )}

          {activeBottomTab === 'overdueSow' && (
            data.bottomLists.overdueSow.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Semua pengerjaan SOW tepat waktu</p>
            ) : (
              data.bottomLists.overdueSow.map((sow: any) => (
                <div key={sow.product} className="flex items-center justify-between p-3 bg-red-500/8 dark:bg-red-950/15 border border-red-500/20 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-[#1D1D1F] dark:text-white block">@{sow.affiliate.username}</span>
                    <span className="text-[10px] text-[#8E8E93]">{sow.product}</span>
                  </div>
                  <span className="text-[10px] text-[#FF3B30] font-bold">Deadline: {sow.deadline ? new Date(sow.deadline).toLocaleDateString('id-ID') : '-'}</span>
                </div>
              ))
            )
          )}

          {activeBottomTab === 'noVideo' && (
            data.bottomLists.noVideo.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Semua creator telah mengupload video SOW</p>
            ) : (
              data.bottomLists.noVideo.map((d: any) => (
                <div key={d.product} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/10 border border-zinc-200/20 rounded-xl">
                  <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">@{d.affiliate.username}</span>
                  <span className="text-[10px] text-[#8E8E93] font-semibold">SOW Produk: {d.product} (0 Video)</span>
                </div>
              ))
            )
          )}

          {activeBottomTab === 'blacklist' && (
            data.bottomLists.blacklist.length === 0 ? (
              <p className="text-center text-xs text-[#8E8E93] py-8">Tidak ada creator baru yang diblacklist</p>
            ) : (
              data.bottomLists.blacklist.map((a: any) => (
                <div key={a.username} className="flex items-center justify-between p-3 bg-red-950/20 dark:bg-red-950/30 border border-red-500/20 rounded-xl">
                  <span className="text-xs font-bold text-[#FF3B30]">@{a.username}</span>
                  <span className="text-[10.5px] text-[#FF453A] font-semibold truncate max-w-xs">{a.blacklistReason || 'Melanggar persetujuan SOW'}</span>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 mb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Executive Live Activity Log</h3>
            <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Seluruh riwayat aktivitas dalam cakupan filter</p>
          </div>
          <Clock className="h-4 w-4 text-[#8E8E93]" />
        </div>
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {data.timeline.length === 0 ? (
            <p className="text-center text-xs text-[#8E8E93] py-8">Belum ada riwayat aktivitas terbaru</p>
          ) : (
            data.timeline.map((item: any) => (
              <div key={item.id} className="flex gap-4 items-start border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
                <div className="h-8 w-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-zinc-500">
                  <User className="h-4 w-4 text-[#6E6E73] dark:text-[#8E8E93]" />
                </div>
                <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                  <div>
                    <p className="text-xs text-[#1D1D1F] dark:text-zinc-300">
                      <span className="font-semibold text-[#1D1D1F] dark:text-white">{item.user}</span>: {item.details}
                    </p>
                    {item.creator && (
                      <span className="text-[9px] font-bold font-mono text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 border border-[#007AFF]/20 rounded-full mt-1.5 inline-block">
                        @{item.creator}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-[#6E6E73] dark:text-[#8E8E93] font-semibold shrink-0">
                    {new Date(item.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {new Date(item.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
