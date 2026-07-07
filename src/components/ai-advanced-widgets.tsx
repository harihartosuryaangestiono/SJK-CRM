'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  BarChart3,
  Brain,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import type { MetricComparison } from '@/lib/ai/analyst'
import type { Anomaly } from '@/lib/ai/anomaly'
import type { Prediction } from '@/lib/ai/predictions'

const SEVERITY_COLORS = {
  high: 'border-[#FF3B30]/30 bg-[#FF3B30]/5',
  medium: 'border-[#FF9F0A]/30 bg-[#FF9F0A]/5',
  low: 'border-[#007AFF]/20 bg-[#007AFF]/5',
}

const CONFIDENCE_COLORS = {
  high: 'text-[#34C759]',
  medium: 'text-[#FF9F0A]',
  low: 'text-[#8E8E93]',
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-[#34C759]" />
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-[#FF3B30]" />
  return <Minus className="h-3 w-3 text-[#8E8E93]" />
}

export function AIAnalyticsPanel() {
  const [comparisons, setComparisons] = useState<MetricComparison[]>([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/copilot/analytics')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setComparisons(json.data.comparisons)
          setSummary(json.data.summary)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-[#34C759]/15 text-[#34C759] rounded-lg">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">AI Business Analyst</h3>
          <p className="text-[9.5px] text-[#8E8E93]">Perbandingan WoW · MoM · trend</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-[#8E8E93]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[11px]">Menghitung analisis...</span>
        </div>
      ) : (
        <>
          <p className="text-[11px] leading-relaxed text-[#1D1D1F] dark:text-zinc-200 mb-4 p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A]">
            {summary}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {comparisons.map(c => (
              <div key={c.label} className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A]">
                <div className="text-[9.5px] font-bold text-[#8E8E93] uppercase truncate">{c.label}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-[#1D1D1F] dark:text-white">
                      {c.unit === 'Rp' ? `Rp ${c.current.toLocaleString('id-ID')}` : c.current}
                      {c.unit === '%' ? '%' : ''}
                    </span>
                    <span className="text-[10px] text-[#8E8E93]">vs {c.previous}{c.unit === '%' ? '%' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={c.trend} />
                    <span className={`text-[10px] font-bold ${c.changePct >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {c.changePct >= 0 ? '+' : ''}{c.changePct}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AIAnomalyPanel() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/copilot/anomalies')
      .then(res => res.json())
      .then(json => { if (json.success) setAnomalies(json.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#FF3B30]/15 text-[#FF3B30] rounded-lg">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">AI Anomaly Detection</h3>
            <p className="text-[9.5px] text-[#8E8E93]">Duplikat · missing data · risiko</p>
          </div>
        </div>
        {!loading && anomalies.length > 0 && (
          <span className="text-[10px] font-bold text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 rounded-full">
            {anomalies.length} detected
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-[#8E8E93]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[11px]">Scanning database...</span>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-8">
          <ShieldAlert className="h-7 w-7 text-[#34C759]/40 mx-auto mb-2" />
          <p className="text-[11px] text-[#8E8E93]">Tidak ada anomali terdeteksi.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {anomalies.map(a => {
            const content = (
              <div className={`rounded-xl border p-3.5 ${SEVERITY_COLORS[a.severity]}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${a.severity === 'high' ? 'text-[#FF3B30]' : a.severity === 'medium' ? 'text-[#FF9F0A]' : 'text-[#007AFF]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#1D1D1F] dark:text-white">{a.title}</span>
                      <span className="text-[10px] font-mono font-bold text-[#8E8E93]">{a.count}</span>
                    </div>
                    <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{a.description}</p>
                    {a.entities && a.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.entities.map(e => (
                          <span key={e.id} className="text-[9px] font-mono bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded-md">
                            {e.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {a.href && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                </div>
              </div>
            )
            return a.href ? (
              <Link key={a.id} href={a.href}>{content}</Link>
            ) : (
              <div key={a.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AIPredictionsPanel() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/copilot/predictions')
      .then(res => res.json())
      .then(json => { if (json.success) setPredictions(json.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-[#5856D6]/15 text-[#5856D6] rounded-lg">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">AI Predictions</h3>
          <p className="text-[9.5px] text-[#8E8E93]">Forecast dengan confidence level</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-[#8E8E93]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[11px]">Menghitung prediksi...</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {predictions.map(p => {
            const inner = (
              <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] hover:border-[#5856D6]/30 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-[#8E8E93] uppercase">{p.title}</div>
                    <div className="text-[15px] font-bold text-[#1D1D1F] dark:text-white mt-0.5">{p.value}</div>
                    <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-snug">{p.reasoning}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[10px] font-bold uppercase ${CONFIDENCE_COLORS[p.confidence]}`}>
                      {p.confidence}
                    </div>
                    <div className="text-[9px] text-[#8E8E93]">{p.confidencePct}%</div>
                  </div>
                </div>
              </div>
            )
            return p.href ? (
              <Link key={p.id} href={p.href}>{inner}</Link>
            ) : (
              <div key={p.id}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
