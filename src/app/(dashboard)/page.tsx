'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users,
  CheckCircle,
  PlusCircle,
  MessageSquare,
  HelpCircle,
  ArrowUpRight,
  Handshake,
  AlertTriangle,
  Flame,
  Percent,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  RefreshCw,
  Search,
  Bell,
  Briefcase,
  UserCheck,
  Zap,
  TrendingDown,
  ChevronRight,
  User,
  ExternalLink
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
import { AIInsightsPanel, AIWorkflowPanel } from '@/components/ai-dashboard-widgets'
import { AIAnalyticsPanel, AIAnomalyPanel, AIPredictionsPanel } from '@/components/ai-advanced-widgets'

interface DashboardData {
  success: boolean
  source: string
  stats: {
    totalAffiliates: number
    activeAffiliates: number
    newThisMonth: number
    contacted: number
    waitingResponse: number
    followUp: number
    reapproach: number
    deals: number
    reject: number
    pending: number
    activeCampaigns: number
    conversionRate: number
    responseRate: number
    
    // Enterprise stats
    todayContacts: number
    todayFollowUps: number
    todayDealsCount: number
    averageResponseTime: string
    averageDealTime: string
    topCampaign: string
    topPIC: string
    topCreator: string
    monthlyGrowth: number
    repeatCreatorRate: number

    // New SOW & Outreach workflow stats
    needFollowUpToday?: number
    needReapproachToday?: number
    sowDueToday?: number
    sowOverdue?: number
    sowInProgress?: number
    sowCompleted?: number
    sowPendingSample?: number
    sowPendingVideo?: number
    blacklistedCreator?: number
    creatorUploadedToday?: number
    creatorCompletedSow?: number
    topGmvCreator?: string
  }
  funnel: Array<{ name: string; count: number; fill: string }>
  charts: {
    outreach: Array<{ day: string; contacted: number; deals: number }>
    dealsMonthly: Array<{ month: string; deals: number }>
    creatorPerformance: Array<{ name: string; gmv: number }>
    growth: Array<{ month: string; total: number }>
  }
  timeline: Array<{
    id: string
    user: string
    action: string
    details: string
    time: string
    creator: string
  }>
}

type Reminder = {
  id: string
  type: 'FOLLOW_UP' | 'NO_RESPONSE' | 'RE_APPROACH' | 'DEADLINE' | 'NOT_PAID'
  dueDate: string
  completed: boolean
  affiliate?: { username: string; name: string | null; status: string }
  deal?: { product: string; nominal: number }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [remindersLoading, setRemindersLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(true)
  const [activeChart, setActiveChart] = useState<'outreach' | 'deals' | 'performance' | 'growth'>('outreach')
  const [activeReminderTab, setActiveReminderTab] = useState<'FOLLOW_UP' | 'NO_RESPONSE' | 'DEADLINE' | 'RE_APPROACH'>('FOLLOW_UP')
  const [currentUser, setCurrentUser] = useState<string>('PIC')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchReminders = async () => {
    try {
      setRemindersLoading(true)
      const res = await fetch('/api/reminders?completed=false')
      if (res.ok) {
        const json = await res.json()
        if (json.success) setReminders(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setRemindersLoading(false)
    }
  }

  const fetchAiSummary = async () => {
    try {
      setAiLoading(true)
      const res = await fetch('/api/dashboard/ai-summary')
      if (res.ok) {
        const json = await res.json()
        setAiSummary(json.summary || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchReminders()
    fetchAiSummary()
    fetch('/api/auth')
      .then(res => res.json())
      .then(d => { if (d.authenticated && d.user?.name) setCurrentUser(d.user.name) })
      .catch(() => {})
  }, [])

  const handleCompleteReminder = async (id: string) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Reminder marked as completed')
        fetchReminders()
      } else {
        toast.error('Failed to complete reminder')
      }
    } catch (e) {
      toast.error('Error completing reminder')
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse max-w-[1200px] mx-auto">
        <div className="h-8 w-56 bg-[#E5E5EA] dark:bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#E5E5EA] dark:bg-zinc-800 rounded-[20px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-72 bg-[#E5E5EA] dark:bg-zinc-800 rounded-[20px]" />
          <div className="h-72 bg-[#E5E5EA] dark:bg-zinc-800 rounded-[20px]" />
        </div>
      </div>
    )
  }

  const { stats, funnel, charts, timeline } = data

  const kpis = [
    { label: "Today's Contact", value: stats.todayContacts, desc: "Pesan outreach keluar hari ini", color: "text-[#007AFF]", bg: "bg-[#007AFF]/10" },
    { label: "Pending Follow Up", value: stats.todayFollowUps, desc: "Outreach jatuh tempo hari ini", color: "text-[#FF9F0A]", bg: "bg-[#FF9F0A]/10" },
    { label: "Deal", value: stats.todayDealsCount, desc: "Kerja sama selesai hari ini", color: "text-[#34C759]", bg: "bg-[#34C759]/10" },
    { label: "Campaign Active", value: stats.activeCampaigns, desc: "Campaign berjalan saat ini", color: "text-[#FF3B30]", bg: "bg-[#FF3B30]/10" }
  ]

  const filteredRemindersList = reminders.filter(r => r.type === activeReminderTab)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-8 max-w-[1200px] mx-auto pb-12"
    >
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#8E8E93] uppercase tracking-[0.1em]">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">
            Selamat datang, {currentUser.split(' ')[0]} 👋
          </h1>
          <p className="text-[12.5px] text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed max-w-lg">
            Berikut ringkasan performa affiliate dan rekomendasi tindakan hari ini.
          </p>
        </div>
        <button
          onClick={() => { fetchDashboardData(); fetchReminders(); fetchAiSummary() }}
          className="flex items-center gap-1.5 bg-white dark:bg-[#2C2C2E] hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white px-4 py-2 rounded-full text-[12px] font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
            className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 flex flex-col justify-between min-h-[110px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">{kpi.label}</span>
              <span className={`h-2 w-2 rounded-full ${kpi.color.replace('text-', 'bg-')}`} />
            </div>
            <div>
              <div className={`text-3xl font-bold tracking-tight leading-none ${kpi.color}`}>{kpi.value}</div>
              <p className="text-[10.5px] text-[#8E8E93] dark:text-[#8E8E93] mt-1.5 leading-snug">{kpi.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Insights & Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIInsightsPanel />
        <AIWorkflowPanel />
      </div>

      {/* AI Analytics, Anomalies & Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AIAnalyticsPanel />
        <AIAnomalyPanel />
        <AIPredictionsPanel />
      </div>

      {/* SOW & Action Items Workflow (11. Dashboard Update) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold tracking-wider text-[#8E8E93] uppercase select-none">Tindakan Workflow & SOW</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">Follow Up Hari Ini</span>
            <div className="text-2xl font-bold tracking-tight text-[#FF9F0A] mt-1">
              {stats.needFollowUpToday || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Jatuh tempo follow up</p>
          </div>
          
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">Re-Approach Hari Ini</span>
            <div className="text-2xl font-bold tracking-tight text-[#007AFF] mt-1">
              {stats.needReapproachToday || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Target re-contact H+30</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">SOW Due Today</span>
            <div className="text-2xl font-bold tracking-tight text-[#FF3B30] mt-1">
              {stats.sowDueToday || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">SOW batas akhir hari ini</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">SOW Overdue</span>
            <div className="text-2xl font-bold tracking-tight text-[#FF3B30] font-black mt-1">
              {stats.sowOverdue || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Batas waktu terlewati</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">Creator Diblacklist</span>
            <div className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white mt-1">
              {stats.blacklistedCreator || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Melanggar SOW/Outreach</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">Creator Upload Hari Ini</span>
            <div className="text-2xl font-bold tracking-tight text-[#34C759] mt-1">
              {stats.creatorUploadedToday || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Upload video baru</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">SOW Selesai Hari Ini</span>
            <div className="text-2xl font-bold tracking-tight text-[#34C759] mt-1">
              {stats.creatorCompletedSow || 0}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Seluruh video terunggah</p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] p-5 shadow-2xs truncate">
            <span className="text-[10px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">Top GMV Creator</span>
            <div className="text-xs font-bold tracking-tight text-[#FFD60A] mt-2 truncate">
              {stats.topGmvCreator || 'N/A'}
            </div>
            <p className="text-[9.5px] text-[#8E8E93] mt-1">Penjualan tertinggi</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Analytics */}
        <div className="lg:col-span-2 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Analytics Insights</h3>
              <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Grafik visual data riwayat CRM</p>
            </div>
            <div className="flex bg-[#F2F2F7] dark:bg-[#1E1E1E] p-0.5 rounded-full border border-[#E5E5EA] dark:border-[#38383A]">
              {[
                { id: 'outreach', label: 'Outreach' },
                { id: 'deals', label: 'Deals' },
                { id: 'performance', label: 'Creators' },
                { id: 'growth', label: 'Growth' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id as any)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    activeChart === tab.id
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-2xs'
                      : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === 'outreach' ? (
                <LineChart data={charts.outreach}>
                  <XAxis dataKey="day" stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '16px',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Line type="monotone" dataKey="contacted" stroke="#007AFF" strokeWidth={2} name="Contacted" dot={false} />
                  <Line type="monotone" dataKey="deals" stroke="#34C759" strokeWidth={2} name="Deals" dot={false} />
                </LineChart>
              ) : activeChart === 'deals' ? (
                <BarChart data={charts.dealsMonthly}>
                  <XAxis dataKey="month" stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
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
                  <Bar dataKey="deals" fill="#34C759" radius={[4, 4, 0, 0]} name="Deals" />
                </BarChart>
              ) : activeChart === 'performance' ? (
                <BarChart data={charts.creatorPerformance} layout="vertical" barSize={8}>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '16px',
                      fontSize: '11px',
                    }}
                  />
                  <XAxis type="number" stroke="#8E8E93" fontSize={10} hide />
                  <YAxis type="category" dataKey="name" stroke="#8E8E93" fontSize={9} tickLine={false} axisLine={false} />
                  <Bar dataKey="gmv" fill="#007AFF" radius={[0, 4, 4, 0]} name="GMV (Juta Rp)" />
                </BarChart>
              ) : (
                <AreaChart data={charts.growth}>
                  <XAxis dataKey="month" stroke="#8E8E93" fontSize={10} tickLine={false} axisLine={false} />
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
                  <defs>
                    <linearGradient id="growthColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34C759" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="#34C759" strokeWidth={2} fillOpacity={1} fill="url(#growthColor)" name="Total Affiliate" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Chart Card */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Funnel Affiliate</h3>
              <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Flow konversi creator SJK</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[#8E8E93]" />
          </div>
          
          <div className="flex flex-col gap-3 mt-5">
            {funnel.map((stage) => {
              const maxCount = Math.max(...funnel.map(f => f.count))
              const pct = Math.max(15, (stage.count / (maxCount || 1)) * 100)
              return (
                <div key={stage.name} className="group flex items-center w-full">
                  <div className="w-[110px] text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate pr-2">
                    {stage.name}
                  </div>
                  <div className="flex-1 bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 rounded-full border border-[#E5E5EA] dark:border-[#38383A]/60 overflow-hidden relative h-6 flex items-center justify-between px-3 group-hover:border-zinc-300 transition-all">
                    <div
                      className="absolute left-0 top-0 bottom-0 opacity-15 dark:opacity-25 transition-all duration-500 rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: stage.fill === '#3b82f6' ? '#007AFF' : stage.fill,
                      }}
                    />
                    <span className="text-[9px] font-bold text-[#6E6E73] dark:text-[#8E8E93] z-10">{pct.toFixed(0)}%</span>
                    <span className="text-[10px] font-bold text-[#1D1D1F] dark:text-white z-10">
                      {stage.count} <span className="text-[9px] font-normal text-[#6E6E73] dark:text-[#8E8E93]">creators</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Recommendation Widget (Apple settings style box) */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 relative overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-[#007AFF]/15 text-[#007AFF] rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">
            AI Daily Agent Recommendation
          </h3>
        </div>
        
        <div className="space-y-4 text-xs text-[#1D1D1F] dark:text-zinc-200">
          <p className="text-xs font-semibold leading-relaxed text-[#1D1D1F] dark:text-white">
            {aiLoading ? "Analisis real-time sedang diolah oleh Gemini AI..." : aiSummary}
          </p>
          <div className="bg-[#F5F5F7] dark:bg-[#1E1E1E]/60 border border-[#E5E5EA] dark:border-[#38383A] rounded-xl p-4 space-y-2.5 text-[#6E6E73] dark:text-[#8E8E93]">
            <div className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] mt-1.5 shrink-0" />
              <span>
                <strong>Top PIC:</strong> <span className="text-[#1D1D1F] dark:text-white font-semibold">{stats.topPIC}</span> memimpin deal bulan ini. Top campaign saat ini adalah <span className="text-[#007AFF] font-bold font-mono">{stats.topCampaign}</span>.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9F0A] mt-1.5 shrink-0" />
              <span>
                <strong>Average Response Speed:</strong> Rata-rata respons creator adalah <span className="text-[#1D1D1F] dark:text-white font-semibold">{stats.averageResponseTime}</span> dengan tingkat conversion deal mencapai <span className="text-[#1D1D1F] dark:text-white font-semibold">{stats.conversionRate}%</span>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Reminder & Queue Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Outreach Reminders Queue</h3>
              <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Daftar tindakan follow-up cepat hari ini</p>
            </div>
            {/* Tabs for types of reminders */}
            <div className="flex bg-[#F2F2F7] dark:bg-[#1E1E1E] p-0.5 rounded-full border border-[#E5E5EA] dark:border-[#38383A]">
              {(['FOLLOW_UP', 'NO_RESPONSE', 'DEADLINE', 'RE_APPROACH'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveReminderTab(tab)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    activeReminderTab === tab
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-2xs'
                      : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 mt-5 max-h-[220px] overflow-y-auto pr-1">
            {remindersLoading ? (
              <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-6">Memutakhirkan antrean...</div>
            ) : filteredRemindersList.length === 0 ? (
              <div className="text-center text-xs text-[#6E6E73] dark:text-[#8E8E93] py-8 leading-relaxed">
                Tidak ada agenda untuk kategori ini hari ini.
              </div>
            ) : (
              filteredRemindersList.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#1E1E1E]/50 border border-[#E5E5EA] dark:border-[#38383A]/60 p-3.5 rounded-2xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#007AFF]" />
                      <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">
                        {r.affiliate ? `@${r.affiliate.username}` : 'General Campaign'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      {r.type === 'FOLLOW_UP' ? 'Butuh Follow Up (3 Hari Tanpa Kontak)' :
                       r.type === 'NO_RESPONSE' ? 'Creator belum membalas pesan (7 Hari)' :
                       r.type === 'DEADLINE' ? `Deadline Campaign: ${r.deal?.product}` :
                       'Re-Approach: Menolak 30 hari yang lalu'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCompleteReminder(r.id)}
                    className="px-4 py-1.5 bg-white dark:bg-[#2C2C2E] hover:bg-[#34C759]/10 border border-[#E5E5EA] dark:border-[#38383A] text-xs font-bold text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#34C759] rounded-full transition-all cursor-pointer shadow-2xs"
                  >
                    Selesai
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action button link card */}
        <div className="bg-[#007AFF] text-white rounded-[24px] p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-tight">Hubungi Creator</h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Kirim template pesan outreach WA, lakukan pitching, atau diskusikan kontrak kerja sama baru secara instan.
            </p>
          </div>
          <Link
            href="/contact"
            className="w-full bg-white text-[#007AFF] hover:bg-zinc-50 font-bold py-3 px-4 rounded-full text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            Mulai Hubungi
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 mb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Recent Activities</h3>
            <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">Seluruh aktivitas terbaru tim affiliate</p>
          </div>
          <Clock className="h-4 w-4 text-[#8E8E93]" />
        </div>
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {timeline.map((item) => (
            <div key={item.id} className="flex gap-4 items-start border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
              <div className="h-8 w-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-zinc-500">
                {item.action === 'DEAL_WON' ? (
                  <Handshake className="h-4 w-4 text-[#34C759]" />
                ) : item.action === 'STATUS_CHANGE' ? (
                  <TrendingUp className="h-4 w-4 text-[#007AFF]" />
                ) : (
                  <Users className="h-4 w-4 text-[#6E6E73]" />
                )}
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
          ))}
        </div>
      </div>
    </motion.div>
  )
}
