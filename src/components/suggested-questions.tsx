'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

type Props = {
  questions: string[]
  onSelect: (question: string) => void
  disabled?: boolean
  label?: string
}

export default function SuggestedQuestions({ questions, onSelect, disabled, label = 'Pertanyaan lanjutan' }: Props) {
  if (questions.length === 0) return null

  return (
    <div className="px-1 pb-2 space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="h-3 w-3 text-[#007AFF]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map(q => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="text-left px-2.5 py-1.5 rounded-xl bg-[#007AFF]/8 hover:bg-[#007AFF]/15 border border-[#007AFF]/20 text-[10px] leading-snug text-[#1D1D1F] dark:text-zinc-200 hover:border-[#007AFF]/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
