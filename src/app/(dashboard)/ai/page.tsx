'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Send,
  Loader2,
  MessageSquarePlus,
  Pin,
  PinOff,
  Trash2,
  Download,
  Copy,
  Check,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CopilotStructuredResponse } from '@/lib/ai/types'
import type { ProactiveAlert } from '@/lib/ai/proactive-alerts'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  structured?: CopilotStructuredResponse | null
}

type Conversation = {
  id: string
  title: string | null
  pinned: boolean
  updatedAt: string
  _count: { messages: number }
  messages: { content: string; role: string }[]
}

const SUGGESTED_PROMPTS = [
  'Apa yang harus saya prioritaskan hari ini?',
  'Siapa yang harus saya follow up hari ini?',
  'Berapa conversion rate affiliate bulan ini?',
  'Berapa SOW yang overdue?',
  'Siapa creator dengan GMV tertinggi?',
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
          <div key={s.key}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8E8E93]">{s.label}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-[#1D1D1F] dark:text-zinc-200 pl-3">{text}</p>
          </div>
        )
      })}
    </div>
  )
}

function AIWorkspaceContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [initialSent, setInitialSent] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/copilot/conversations')
      const json = await res.json()
      if (json.success) setConversations(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingConversations(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/copilot/alerts')
      const json = await res.json()
      if (json.success) setAlerts(json.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchConversations()
    fetchAlerts()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (initialQuery && !initialSent) {
      setInitialSent(true)
      sendMessage(initialQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialSent])

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/copilot/conversations/${id}`)
      const json = await res.json()
      if (json.success) {
        setActiveId(id)
        setMessages(json.data.messages)
      }
    } catch {
      toast.error('Gagal memuat percakapan')
    }
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: activeId ?? undefined,
          context: { page: '/ai' },
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.message || 'Gagal memproses')
        return
      }

      setActiveId(json.conversationId)
      setMessages(prev => [
        ...prev,
        {
          id: json.message.id,
          role: 'assistant',
          content: json.message.content,
          structured: json.message.structured,
        },
      ])
      fetchConversations()
    } catch {
      toast.error('Koneksi gagal')
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    setActiveId(null)
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const handlePin = async (id: string, pinned: boolean) => {
    try {
      const res = await fetch(`/api/copilot/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !pinned }),
      })
      if (res.ok) {
        toast.success(pinned ? 'Unpinned' : 'Pinned')
        fetchConversations()
      }
    } catch {
      toast.error('Gagal update pin')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus percakapan ini?')) return
    try {
      await fetch(`/api/copilot/conversations/${id}`, { method: 'DELETE' })
      if (activeId === id) handleNewChat()
      fetchConversations()
      toast.success('Percakapan dihapus')
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  const handleExportChat = async () => {
    if (!activeId) {
      toast.error('Pilih percakapan terlebih dahulu')
      return
    }
    try {
      const res = await fetch(`/api/copilot/export?type=conversation&conversationId=${activeId}`)
      const json = await res.json()
      if (json.success) {
        downloadText(json.content, json.filename)
        toast.success('Chat diekspor')
      }
    } catch {
      toast.error('Export gagal')
    }
  }

  const handleExportDaily = async () => {
    try {
      const res = await fetch('/api/copilot/export?type=daily-summary')
      const json = await res.json()
      if (json.success) {
        downloadText(json.content, json.filename)
        toast.success('Daily summary diekspor')
      }
    } catch {
      toast.error('Export gagal')
    }
  }

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async (msg: Message) => {
    await navigator.clipboard.writeText(msg.content)
    setCopiedId(msg.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const pinned = conversations.filter(c => c.pinned)
  const recent = conversations.filter(c => !c.pinned)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#007AFF]" />
            AI Copilot Workspace
          </h1>
          <p className="text-[11px] text-[#8E8E93] mt-0.5">
            Enterprise affiliate intelligence · data-driven · actionable
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDaily}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] text-[11px] font-semibold text-[#1D1D1F] dark:text-white hover:border-[#007AFF]/40 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export Daily Summary
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-4 min-h-0">
        {/* Conversation sidebar */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#E5E5EA] dark:border-[#38383A] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Percakapan</span>
            <button
              onClick={handleNewChat}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] text-[#007AFF] cursor-pointer"
              title="Baru"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {loadingConversations ? (
              <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#8E8E93]" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-[10px] text-[#8E8E93] text-center py-6">Belum ada percakapan</p>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-[#8E8E93] uppercase px-2 mb-1">Pinned</p>
                    {pinned.map(c => (
                      <ConversationItem
                        key={c.id}
                        conv={c}
                        active={activeId === c.id}
                        onSelect={() => loadConversation(c.id)}
                        onPin={() => handlePin(c.id, c.pinned)}
                        onDelete={() => handleDelete(c.id)}
                      />
                    ))}
                  </div>
                )}
                {recent.length > 0 && (
                  <div>
                    {pinned.length > 0 && <p className="text-[9px] font-bold text-[#8E8E93] uppercase px-2 mb-1">Recent</p>}
                    {recent.map(c => (
                      <ConversationItem
                        key={c.id}
                        conv={c}
                        active={activeId === c.id}
                        onSelect={() => loadConversation(c.id)}
                        onPin={() => handlePin(c.id, c.pinned)}
                        onDelete={() => handleDelete(c.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] flex flex-col overflow-hidden min-h-[400px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="max-w-lg mx-auto text-center py-10 space-y-6">
                <Sparkles className="h-10 w-10 text-[#007AFF]/30 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">SJ Kitchen AI Copilot</p>
                  <p className="text-[11px] text-[#8E8E93] mt-1 leading-relaxed">
                    Tanyakan tentang affiliate, deal, campaign, atau minta rekomendasi strategis.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTED_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="px-3 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] text-[11px] text-left hover:border-[#007AFF]/40 cursor-pointer transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-[16px] px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A]'
                }`}>
                  {msg.role === 'assistant' && msg.structured ? (
                    <StructuredSections data={msg.structured} />
                  ) : (
                    <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.role === 'assistant' && (
                    <button onClick={() => handleCopy(msg)} className="mt-2 flex items-center gap-1 text-[9px] text-[#8E8E93] hover:text-[#007AFF] cursor-pointer">
                      {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Salin
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[#8E8E93] text-[11px]">
                <Loader2 className="h-4 w-4 animate-spin text-[#007AFF]" />
                Menganalisis data CRM...
              </div>
            )}
          </div>
          <div className="shrink-0 p-4 border-t border-[#E5E5EA] dark:border-[#38383A]">
            <div className="flex items-end gap-2">
              {activeId && (
                <button onClick={handleExportChat} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-[#E5E5EA] dark:border-[#38383A] text-[#8E8E93] hover:text-[#007AFF] cursor-pointer" title="Export chat">
                  <Download className="h-4 w-4" />
                </button>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder="Tanyakan apa saja tentang CRM..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[#E5E5EA] dark:border-[#38383A] bg-[#F5F5F7] dark:bg-[#1E1E1E] px-4 py-2.5 text-[12px] focus:outline-none focus:border-[#007AFF]/50 max-h-28"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-[#007AFF] text-white disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* AI Alerts panel */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-[20px] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#E5E5EA] dark:border-[#38383A] flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-[#FF9F0A]" />
            <span className="text-[10px] font-bold uppercase text-[#8E8E93]">AI Proactive Alerts</span>
            {alerts.length > 0 && (
              <span className="ml-auto text-[9px] font-bold bg-[#FF3B30]/10 text-[#FF3B30] px-1.5 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {alerts.length === 0 ? (
              <p className="text-[10px] text-[#8E8E93] text-center py-8">Semua clear — tidak ada alert.</p>
            ) : (
              alerts.map(a => {
                const inner = (
                  <div className={`p-2.5 rounded-xl border text-left transition-all ${
                    a.priority === 'critical' ? 'border-[#FF3B30]/25 bg-[#FF3B30]/5' :
                    a.priority === 'high' ? 'border-[#FF9F0A]/25 bg-[#FF9F0A]/5' :
                    'border-[#007AFF]/20 bg-[#007AFF]/5'
                  }`}>
                    <div className="text-[10px] font-bold text-[#1D1D1F] dark:text-white">{a.title}</div>
                    <p className="text-[9.5px] text-[#8E8E93] mt-0.5 leading-snug">{a.message}</p>
                  </div>
                )
                return a.href ? (
                  <Link key={a.id} href={a.href}>{inner}</Link>
                ) : (
                  <div key={a.id}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConversationItem({
  conv,
  active,
  onSelect,
  onPin,
  onDelete,
}: {
  conv: Conversation
  active: boolean
  onSelect: () => void
  onPin: () => void
  onDelete: () => void
}) {
  const preview = conv.messages[0]?.content?.slice(0, 60) || 'Percakapan kosong'
  return (
    <div className={`group rounded-xl p-2 cursor-pointer transition-all ${
      active ? 'bg-[#007AFF]/10 border border-[#007AFF]/25' : 'hover:bg-[#F5F5F7] dark:hover:bg-[#1E1E1E] border border-transparent'
    }`}>
      <button onClick={onSelect} className="w-full text-left">
        <div className="text-[11px] font-semibold text-[#1D1D1F] dark:text-white truncate flex items-center gap-1">
          {conv.pinned && <Pin className="h-2.5 w-2.5 text-[#007AFF] shrink-0" />}
          {conv.title || 'Percakapan'}
        </div>
        <p className="text-[9.5px] text-[#8E8E93] truncate mt-0.5">{preview}</p>
        <span className="text-[8.5px] text-[#8E8E93]">{conv._count.messages} pesan</span>
      </button>
      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onPin} className="p-1 rounded-md hover:bg-white/50 dark:hover:bg-black/20 text-[#8E8E93] hover:text-[#007AFF] cursor-pointer">
          {conv.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button onClick={onDelete} className="p-1 rounded-md hover:bg-white/50 dark:hover:bg-black/20 text-[#8E8E93] hover:text-[#FF3B30] cursor-pointer">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export default function AIWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
      </div>
    }>
      <AIWorkspaceContent />
    </Suspense>
  )
}
