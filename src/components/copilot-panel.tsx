'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Loader2, MessageSquarePlus, Copy, Check, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { CopilotStructuredResponse } from '@/lib/ai/types'
import SuggestedQuestions from '@/components/suggested-questions'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  structured?: CopilotStructuredResponse | null
}

const SUGGESTED_PROMPTS = [
  'Siapa yang harus saya follow up hari ini?',
  'Berapa conversion rate affiliate bulan ini?',
  'Siapa creator dengan GMV tertinggi?',
  'Berapa SOW yang overdue?',
  'Apa yang harus saya prioritaskan hari ini?',
]

function StructuredSections({ data }: { data: CopilotStructuredResponse }) {
  const sections = [
    { key: 'summary', label: 'Ringkasan', color: 'bg-[#007AFF]' },
    { key: 'analysis', label: 'Analisis', color: 'bg-[#5856D6]' },
    { key: 'insight', label: 'Insight', color: 'bg-[#FF9F0A]' },
    { key: 'recommendation', label: 'Rekomendasi', color: 'bg-[#34C759]' },
    { key: 'nextAction', label: 'Langkah Selanjutnya', color: 'bg-[#FF3B30]' },
  ] as const

  return (
    <div className="space-y-3">
      {sections.map(s => {
        const text = data[s.key]
        if (!text) return null
        return (
          <div key={s.key} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8E8E93]">{s.label}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-[#1D1D1F] dark:text-zinc-200 pl-3">{text}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function CopilotPanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const getPageContext = () => {
    const affiliateMatch = pathname.match(/\/affiliates\/([^/]+)/)
    return {
      page: pathname,
      affiliateId: affiliateMatch?.[1],
    }
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSuggestedFollowUps([])
    setLoading(true)

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: conversationId ?? undefined,
          context: getPageContext(),
        }),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.message || 'Gagal memproses pertanyaan')
        return
      }

      setConversationId(json.conversationId)
      setSuggestedFollowUps(json.suggestedFollowUps || [])
      setMessages(prev => [
        ...prev,
        {
          id: json.message.id,
          role: 'assistant',
          content: json.message.content,
          structured: json.message.structured,
        },
      ])
    } catch {
      toast.error('Koneksi gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setSuggestedFollowUps([])
  }

  const handleCopy = async (msg: Message) => {
    await navigator.clipboard.writeText(msg.content)
    setCopiedId(msg.id)
    toast.success('Disalin ke clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating button — hidden on full workspace page */}
      {!open && pathname !== '/ai' && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-[#007AFF] text-white shadow-[0_4px_24px_rgba(0,122,255,0.4)] hover:bg-[#0066DD] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="SJ Kitchen AI Copilot"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panel overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end md:p-5">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />

          <div className="relative w-full md:w-[420px] md:max-h-[85vh] h-[85vh] md:h-auto bg-white dark:bg-[#2C2C2E] rounded-t-[24px] md:rounded-[24px] border border-[#E5E5EA] dark:border-[#38383A] shadow-[0_8px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA] dark:border-[#38383A] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[#007AFF]/15 text-[#007AFF] rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-[#1D1D1F] dark:text-white">AI Copilot</h2>
                  <p className="text-[9.5px] text-[#8E8E93]">Data-driven · SJ Kitchen CRM</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/ai"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] text-[#8E8E93] hover:text-[#007AFF] transition-colors cursor-pointer"
                  title="Buka AI Workspace"
                >
                  <Maximize2 className="h-4 w-4" />
                </Link>
                <button
                  onClick={handleNewChat}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] text-[#8E8E93] hover:text-[#007AFF] transition-colors cursor-pointer"
                  title="Percakapan baru"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <Sparkles className="h-8 w-8 text-[#007AFF]/40 mx-auto mb-3" />
                    <p className="text-[12px] font-semibold text-[#1D1D1F] dark:text-white mb-1">
                      Halo! Saya SJ Kitchen AI Copilot.
                    </p>
                    <p className="text-[10.5px] text-[#8E8E93] leading-relaxed max-w-[280px] mx-auto">
                      Tanyakan apa saja tentang affiliate, deal, campaign, atau prioritas hari ini. Semua jawaban berbasis data CRM.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93] px-1">Saran pertanyaan</p>
                    {SUGGESTED_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] text-[11px] text-[#1D1D1F] dark:text-zinc-200 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-[16px] px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A]'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.structured ? (
                      <StructuredSections data={msg.structured} />
                    ) : (
                      <p className="text-[11.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg)}
                        className="mt-2 flex items-center gap-1 text-[9px] text-[#8E8E93] hover:text-[#007AFF] transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedId === msg.id ? 'Disalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[16px] px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007AFF]" />
                    <span className="text-[11px] text-[#8E8E93]">Menganalisis data CRM...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 py-3 border-t border-[#E5E5EA] dark:border-[#38383A] bg-[#FAFAFA] dark:bg-[#1C1C1E]">
              <SuggestedQuestions
                questions={suggestedFollowUps}
                onSelect={sendMessage}
                disabled={loading}
                label="Pertanyaan lanjutan"
              />
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanyakan tentang affiliate, deal, campaign..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] px-3.5 py-2.5 text-[12px] text-[#1D1D1F] dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#007AFF]/50 max-h-24"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-[#007AFF] text-white hover:bg-[#0066DD] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[8.5px] text-[#8E8E93] mt-1.5 text-center">
                Jawaban berbasis data CRM · Tidak mengeksekusi aksi destruktif
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
