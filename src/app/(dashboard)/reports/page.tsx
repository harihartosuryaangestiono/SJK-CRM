'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Download,
  Printer,
  TrendingUp,
  Percent,
  Award,
  Users,
  Briefcase,
  FileText,
  Loader2
} from 'lucide-react'

interface TopCreator {
  username: string
  followers: string
  gmv: string
  status: string
}

interface PicPerformance {
  name: string
  role: string
  contacted: number
  deals: number
}

interface CampaignROI {
  name: string
  budget: number
  creators: number
  roi: number
}

export default function ReportsPage() {
  const [topCreators, setTopCreators] = useState<TopCreator[]>([])
  const [pics, setPics] = useState<PicPerformance[]>([])
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([])
  const [responseRate, setResponseRate] = useState<number>(0)
  const [conversionRate, setConversionRate] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch from dashboard statistics
      const dashRes = await fetch('/api/dashboard')
      if (dashRes.ok) {
        const dashJson = await dashRes.json()
        if (dashJson.success && dashJson.stats) {
          setResponseRate(dashJson.stats.responseRate || 0)
          setConversionRate(dashJson.stats.conversionRate || 0)
        }
      }

      // 2. Fetch from dynamic reports endpoint
      const repRes = await fetch('/api/reports')
      if (repRes.ok) {
        const repJson = await repRes.json()
        if (repJson.success) {
          setTopCreators(repJson.topCreators || [])
          setPics(repJson.pics || [])
          setCampaigns(repJson.campaigns || [])
        }
      }
    } catch (e) {
      console.error('Failed to load reports data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
        <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Menghasilkan Laporan Executive...</p>
      </div>
    )
  }

  const isEmpty = topCreators.length === 0 && pics.length === 0 && campaigns.length === 0

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-12 print:p-0 print:bg-white print:text-zinc-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">CRM Reports</h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed max-w-xl">
            Analisis dan laporan otomatis mengenai performa affiliate, PIC, dan ROI campaign terintegrasi langsung dengan database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white dark:bg-[#2C2C2E] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="h-4 w-4" />
            Cetak PDF
          </button>
          
          <a
            href="/api/affiliates/import-export"
            download
            className="flex items-center gap-1.5 bg-[#007AFF] hover:bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Download className="h-4 w-4" />
            Download Excel Report
          </a>
        </div>
      </div>

      {/* Print only header */}
      <div className="hidden print:block text-center border-b border-zinc-300 pb-5 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">SJ KITCHEN CRM REPORT</h1>
        <p className="text-sm text-zinc-600 mt-1">Laporan Analitik Kinerja Pemasaran Affiliate Terintegrasi</p>
        <p className="text-xs text-zinc-500 mt-0.5">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {isEmpty ? (
        /* APPLE STYLE EMPTY STATE */
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-12 text-center max-w-lg mx-auto space-y-6 shadow-2xs mt-8">
          <div className="mx-auto h-16 w-16 bg-[#F5F5F7] dark:bg-zinc-850 rounded-full flex items-center justify-center text-[#6E6E73] dark:text-[#8E8E93]">
            <FileText className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Laporan Kosong</h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
              Belum ada data affiliate, PIC, atau campaign terdaftar untuk memicu analisis performa laporan.
            </p>
          </div>
          <Link
            href="/affiliates"
            className="inline-block bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold px-6 py-3 rounded-full shadow-2xs active:scale-[0.98] transition-all"
          >
            Mulai Tambah Affiliate
          </Link>
        </div>
      ) : (
        <>
          {/* Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="apple-card p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase tracking-wider select-none">Response Rate</span>
                <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">{responseRate.toFixed(1)}%</h2>
                <p className="text-[10px] text-[#34C759] font-semibold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> Stabil vs bulan lalu
                </p>
              </div>
              <div className="p-3 bg-[#007AFF]/10 rounded-full text-[#007AFF]">
                <Percent className="h-5 w-5" />
              </div>
            </div>

            <div className="apple-card p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase tracking-wider select-none">Conversion Rate</span>
                <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">{conversionRate.toFixed(1)}%</h2>
                <p className="text-[10px] text-[#34C759] font-semibold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> Metrik progresif real-time
                </p>
              </div>
              <div className="p-3 bg-[#34C759]/10 rounded-full text-[#34C759]">
                <Percent className="h-5 w-5" />
              </div>
            </div>

            <div className="apple-card p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase tracking-wider select-none">Join Rate</span>
                <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">15.0%</h2>
                <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-semibold flex items-center gap-0.5">
                  Batas rata-rata industri
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-full text-purple-500">
                <Percent className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOP PERFORMING CREATORS */}
            <div className="apple-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-[#34C759]" />
                Top Creator by GMV
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 text-[#6E6E73] dark:text-[#8E8E93] text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5">Username</th>
                      <th className="py-2.5">Followers</th>
                      <th className="py-2.5 text-right">Estimated GMV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {topCreators.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-[#6E6E73] dark:text-[#8E8E93]">Tidak ada data creator</td>
                      </tr>
                    ) : (
                      topCreators.map((creator) => (
                        <tr key={creator.username} className="hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/40">
                          <td className="py-3.5 font-mono text-[#1D1D1F] dark:text-zinc-200">@{creator.username}</td>
                          <td className="py-3.5 text-[#6E6E73] dark:text-[#8E8E93]">{creator.followers}</td>
                          <td className="py-3.5 text-right font-bold text-[#34C759]">{creator.gmv}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PIC TEAM PERFORMANCE */}
            <div className="apple-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#007AFF]" />
                PIC Performance Leaderboard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 text-[#6E6E73] dark:text-[#8E8E93] text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5">Team Name</th>
                      <th className="py-2.5">Contacted</th>
                      <th className="py-2.5 text-right">Deals Closed</th>
                      <th className="py-2.5 text-right">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {pics.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#6E6E73] dark:text-[#8E8E93]">Tidak ada data PIC aktif</td>
                      </tr>
                    ) : (
                      pics.map((pic) => {
                        const rate = pic.contacted > 0 ? ((pic.deals / pic.contacted) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={pic.name} className="hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/40">
                            <td className="py-3.5">
                              <span className="font-semibold text-[#1D1D1F] dark:text-zinc-200">{pic.name}</span>
                              <span className="text-[9px] font-bold text-[#6E6E73] dark:text-[#8E8E93] bg-[#F2F2F7] dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-[#E5E5EA] dark:border-[#38383A] ml-1.5 uppercase">
                                {pic.role}
                              </span>
                            </td>
                            <td className="py-3.5 text-[#6E6E73] dark:text-[#8E8E93]">{pic.contacted} creators</td>
                            <td className="py-3.5 text-right font-bold text-[#1D1D1F] dark:text-white">{pic.deals} deals</td>
                            <td className="py-3.5 text-right font-bold text-[#34C759]">{rate}%</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CAMPAIGN ROI SUMMARY */}
          <div className="apple-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-3 flex items-center gap-2">
              <Briefcase className="h-4.5 w-4.5 text-purple-500" />
              Campaign ROI & Conversion Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 text-[#6E6E73] dark:text-[#8E8E93] text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5">Campaign Name</th>
                    <th className="py-2.5">Budget Allocated</th>
                    <th className="py-2.5 text-right">Creators Joined</th>
                    <th className="py-2.5 text-right">ROI (Multiplier)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[#6E6E73] dark:text-[#8E8E93]">Tidak ada data campaign</td>
                    </tr>
                  ) : (
                    campaigns.map((camp) => (
                      <tr key={camp.name} className="hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/40">
                        <td className="py-3.5 font-semibold text-[#1D1D1F] dark:text-zinc-200">{camp.name}</td>
                        <td className="py-3.5 text-[#6E6E73] dark:text-[#8E8E93]">Rp {camp.budget.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 text-right font-semibold text-[#1D1D1F] dark:text-white">{camp.creators} creators</td>
                        <td className="py-3.5 text-right font-bold text-[#34C759]">
                          {camp.roi > 0 ? `${camp.roi}% (+${(camp.roi / 100).toFixed(1)}x)` : 'Running (Pending)'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
