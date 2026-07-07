'use client'

import React, { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import type { HealthScoreResult } from '@/lib/ai/health-score'
import { CATEGORY_COLORS } from '@/lib/ai/health-score'

const FACTOR_LABELS: Record<string, string> = {
  activity: 'Activity',
  responseSpeed: 'Response',
  dealHistory: 'Deals',
  revenue: 'GMV',
  videoCompletion: 'Video',
  sowCompletion: 'SOW',
  communication: 'Comms',
  growth: 'Growth',
}

export default function AffiliateHealthScore({ affiliateId }: { affiliateId: string }) {
  const [health, setHealth] = useState<HealthScoreResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!affiliateId) return
    fetch(`/api/copilot/health-score?affiliateId=${affiliateId}`)
      .then(res => res.json())
      .then(json => { if (json.success) setHealth(json.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [affiliateId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-[#8E8E93]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-[10px]">Menghitung health score...</span>
      </div>
    )
  }

  if (!health) return null

  const colorClass = CATEGORY_COLORS[health.category]
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (health.score / 100) * circumference

  return (
    <div className="border-b border-[#E5E5EA] dark:border-[#38383A]/60 pb-4 mb-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-bold uppercase flex items-center gap-1">
          <Heart className="h-3 w-3" /> AI Health Score
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${colorClass}`}>
          {health.category}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-[88px] w-[88px] shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-[#E5E5EA] dark:text-[#38383A]" />
            <circle
              cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={health.score >= 60 ? 'text-[#34C759]' : health.score >= 40 ? 'text-[#FF9F0A]' : 'text-[#FF3B30]'}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-[#1D1D1F] dark:text-white">{health.score}</span>
            <span className="text-[8px] text-[#8E8E93] font-bold">/100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] leading-relaxed text-[#6E6E73] dark:text-[#8E8E93] mb-2 line-clamp-3">
            {health.narrative}
          </p>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(health.factors).map(([key, val]) => (
              <div key={key} className="text-center">
                <div className="text-[9px] font-bold text-[#1D1D1F] dark:text-white">{val}</div>
                <div className="text-[7.5px] text-[#8E8E93] uppercase truncate">{FACTOR_LABELS[key]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
