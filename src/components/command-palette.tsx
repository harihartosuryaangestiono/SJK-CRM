'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Database, Flame, Handshake, ShieldAlert, X, ChevronRight, Sparkles } from 'lucide-react'

type SmartResult = {
  label: string
  description: string
  href: string
  type: 'creator' | 'deal' | 'campaign' | 'insight'
}

type FlatItem = {
  type: string
  label: string
  sublabel?: string
  href: string
  isAi?: boolean
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    affiliates: Array<{ id: string; username: string; name: string | null; status: string }>
    campaigns: Array<{ id: string; name: string; status: string }>
    deals: Array<{ id: string; product: string; nominal: number; affiliate: { username: string } }>
    users: Array<{ id: string; name: string; role: string }>
  }>({ affiliates: [], campaigns: [], deals: [], users: [] })
  const [smartResults, setSmartResults] = useState<SmartResult[]>([])
  const [smartDescription, setSmartDescription] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ affiliates: [], campaigns: [], deals: [], users: [] })
      setSmartResults([])
      setSmartDescription(null)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoading(true)
        const encoded = encodeURIComponent(query)
        const [searchRes, smartRes] = await Promise.all([
          fetch(`/api/search?q=${encoded}`),
          query.trim().length >= 8 ? fetch(`/api/copilot/smart-search?q=${encoded}`) : Promise.resolve(null),
        ])

        const searchJson = await searchRes.json()
        if (searchJson.success) {
          setResults(searchJson.data)
        }

        if (smartRes) {
          const smartJson = await smartRes.json()
          if (smartJson.success && smartJson.isNaturalLanguage) {
            setSmartResults(smartJson.data || [])
            setSmartDescription(smartJson.description || null)
          } else {
            setSmartResults([])
            setSmartDescription(null)
          }
        } else {
          setSmartResults([])
          setSmartDescription(null)
        }

        setSelectedIndex(0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setQuery('')
      setSmartResults([])
      setSmartDescription(null)
    }
  }, [isOpen])

  const isAiQuery = query.trim().toLowerCase().startsWith('ai ') || query.trim().toLowerCase().startsWith('ai:') || query.trim().startsWith('?')
  const aiQueryText = query.trim().replace(/^(ai[:\s]|\?)/i, '').trim()

  const flatItems: FlatItem[] = [
    ...(isAiQuery ? [{
      type: 'ai-ask',
      label: `Tanya AI: "${aiQueryText}"`,
      sublabel: 'Buka AI Copilot Workspace',
      href: `/ai?q=${encodeURIComponent(aiQueryText)}`,
      isAi: true,
    }] : []),
    ...smartResults.map(r => ({
      type: r.type,
      label: r.label,
      sublabel: r.description,
      href: r.href,
      isAi: true,
    })),
    ...results.affiliates.map(a => ({ type: 'creator', label: `@${a.username} (${a.name || 'No Name'})`, href: `/affiliates/${a.id}` })),
    ...results.campaigns.map(c => ({ type: 'campaign', label: c.name, href: `/campaigns` })),
    ...results.deals.map(d => ({ type: 'deal', label: `Deal with @${d.affiliate.username} - ${d.product}`, href: `/deals` })),
    ...results.users.map(u => ({ type: 'user', label: `${u.name} [PIC - ${u.role}]`, href: `/settings` })),
  ]

  const handleSelect = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatItems[selectedIndex]) {
        handleSelect(flatItems[selectedIndex].href)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-zinc-300 flex flex-col max-h-[500px]">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 gap-3 bg-zinc-950">
          <Search className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari creator, atau tanya: creator GMV di atas 10 juta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleListKeyDown}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-zinc-500 text-zinc-100"
          />
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono shrink-0 select-none">
            ESC
          </span>
          <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300 shrink-0 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          {loading ? (
            <div className="text-center text-xs text-zinc-500 py-10 font-semibold tracking-wide">Searching...</div>
          ) : query.trim() === '' ? (
            <div className="text-center text-xs text-zinc-500 py-10 font-semibold leading-relaxed">
              Cari affiliate, campaign, deal — atau ketik <span className="font-mono text-[#007AFF]">ai </span> untuk tanya copilot.<br />
              <span className="text-[10px] text-zinc-600 mt-2 block">Contoh: &quot;ai siapa follow up hari ini&quot;, &quot;creator belum dihubungi 30 hari&quot;</span>
            </div>
          ) : flatItems.length === 0 ? (
            <div className="text-center text-xs text-zinc-500 py-10 font-semibold">Tidak ada hasil.</div>
          ) : (
            <div className="space-y-3">
              {smartResults.length > 0 && smartDescription && (
                <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-[#007AFF] uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  AI Smart Search — {smartDescription}
                </div>
              )}
              <div className="space-y-1.5">
                {flatItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={`${item.href}-${idx}`}
                      onClick={() => handleSelect(item.href)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-md shadow-zinc-950/20'
                          : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-900/50 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.isAi ? <Sparkles className="h-4 w-4 shrink-0 text-[#007AFF]" /> : null}
                        {!item.isAi && item.type === 'creator' && <Database className="h-4 w-4 shrink-0" />}
                        {!item.isAi && item.type === 'campaign' && <Flame className="h-4 w-4 shrink-0" />}
                        {!item.isAi && item.type === 'deal' && <Handshake className="h-4 w-4 shrink-0" />}
                        {!item.isAi && item.type === 'user' && <ShieldAlert className="h-4 w-4 shrink-0" />}
                        {!item.isAi && item.type === 'insight' && <Sparkles className="h-4 w-4 shrink-0" />}
                        {item.type === 'ai-ask' && <Sparkles className="h-4 w-4 shrink-0 text-[#007AFF]" />}
                        <div className="min-w-0">
                          <span className="truncate block">{item.label}</span>
                          {item.sublabel && (
                            <span className={`text-[10px] font-normal truncate block ${isSelected ? 'text-zinc-600' : 'text-zinc-600'}`}>
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
