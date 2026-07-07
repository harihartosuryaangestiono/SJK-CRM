'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, TrendingUp, AlertTriangle, Info, ChevronRight, Loader2, Zap, ListChecks } from 'lucide-react'
import type { AIInsight, WorkflowTask } from '@/lib/ai/types'

const INSIGHT_ICONS = {
  positive: TrendingUp,
  warning: AlertTriangle,
  critical: AlertTriangle,
  info: Info,
}

const INSIGHT_COLORS = {
  positive: 'text-[#34C759] bg-[#34C759]/10 border-[#34C759]/20',
  warning: 'text-[#FF9F0A] bg-[#FF9F0A]/10 border-[#FF9F0A]/20',
  critical: 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/20',
  info: 'text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/20',
}

const PRIORITY_COLORS = {
  1: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20',
  2: 'bg-[#FF9F0A]/10 text-[#FF9F0A] border-[#FF9F0A]/20',
  3: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20',
}

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/copilot/insights')
      .then(res => res.json())
      .then(json => { if (json.success) setInsights(json.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-[#5856D6]/15 text-[#5856D6] rounded-lg">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">AI Insight Engine</h3>
          <p className="text-[9.5px] text-[#8E8E93]">Pola & anomali terdeteksi dari data CRM</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-[#8E8E93]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[11px]">Menganalisis data...</span>
        </div>
      ) : insights.length === 0 ? (
        <p className="text-[11px] text-[#8E8E93] text-center py-6">Belum ada insight untuk ditampilkan.</p>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {insights.map(insight => {
            const Icon = INSIGHT_ICONS[insight.type]
            const colorClass = INSIGHT_COLORS[insight.type]
            const content = (
              <div className={`rounded-xl border p-3.5 transition-all ${colorClass} ${insight.href ? 'hover:opacity-90 cursor-pointer' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold">{insight.title}</span>
                      {insight.metric && (
                        <span className="text-[10px] font-mono font-bold opacity-80 shrink-0">{insight.metric}</span>
                      )}
                    </div>
                    <p className="text-[10.5px] leading-relaxed mt-1 opacity-90">{insight.message}</p>
                    {insight.action && (
                      <p className="text-[9.5px] mt-1.5 opacity-75 italic">→ {insight.action}</p>
                    )}
                  </div>
                  {insight.href && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                </div>
              </div>
            )
            return insight.href ? (
              <Link key={insight.id} href={insight.href}>{content}</Link>
            ) : (
              <div key={insight.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AIWorkflowPanel() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/copilot/workflow')
      .then(res => res.json())
      .then(json => { if (json.success) setTasks(json.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[24px] p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#FF9F0A]/15 text-[#FF9F0A] rounded-lg">
            <ListChecks className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">AI Workflow Assistant</h3>
            <p className="text-[9.5px] text-[#8E8E93]">Prioritas tindakan hari ini</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold text-[#8E8E93]">
          <Sparkles className="h-3 w-3" />
          {tasks.length} tasks
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-[#8E8E93]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[11px]">Memuat workflow...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8">
          <ListChecks className="h-7 w-7 text-[#D1D1D6] mx-auto mb-2" />
          <p className="text-[11px] text-[#8E8E93]">Semua tugas hari ini sudah clear!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {tasks.map(task => (
            <Link
              key={task.id}
              href={task.href}
              className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] hover:border-[#007AFF]/30 transition-all group"
            >
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[task.priority]}`}>
                P{task.priority}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#1D1D1F] dark:text-white group-hover:text-[#007AFF] transition-colors truncate">
                  {task.title}
                </div>
                <p className="text-[10px] text-[#8E8E93] mt-0.5 leading-snug">{task.description}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#8E8E93] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
