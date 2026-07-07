'use client'

import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/sidebar'
import { useSidebar } from '@/components/sidebar-context'
import CommandPalette from '@/components/command-palette'
import CopilotPanel from '@/components/copilot-panel'
import { Bell, Search, Check, ShieldAlert, Clock, Home, MessageSquare, Sun, Moon, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

type Notification = {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

type AIAlert = {
  id: string
  title: string
  message: string
  priority: string
  href?: string
}

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [aiAlerts, setAiAlerts] = useState<AIAlert[]>([])
  const [inboxTab, setInboxTab] = useState<'inbox' | 'ai'>('inbox')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Mount realtime sync — invalidates TanStack Query caches when DB changes
  useRealtimeSync()

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) return
      const json = await res.json()
      if (json.success) setNotifications(json.data)
    } catch (e) { console.error(e) }
  }

  const fetchAiAlerts = async () => {
    try {
      const res = await fetch('/api/copilot/alerts')
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) return
      const json = await res.json()
      if (json.success) setAiAlerts(json.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchNotifications()
    fetchAiAlerts()
    const interval = setInterval(() => {
      fetchNotifications()
      fetchAiAlerts()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const json = await res.json()
      if (json.success) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success('Notifikasi ditandai telah dibaca')
      }
    } catch (e) { console.error(e) }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
      const json = await res.json()
      if (json.success) {
        setNotifications([])
        toast.success('Semua notifikasi dibersihkan')
      }
    } catch (e) { console.error(e) }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#161617] text-[#1D1D1F] dark:text-white flex transition-colors duration-300">
      <CommandPalette />
      <CopilotPanel />
      <Sidebar />

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isCollapsed ? 'pl-0 md:pl-[92px]' : 'pl-0 md:pl-[264px]'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between px-5 bg-[#F5F5F7]/90 dark:bg-[#161617]/90 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#2C2C2E] transition-colors">
          {/* Left */}
          <div className="flex-1 flex items-center">
            <span className="hidden md:inline-block text-[10.5px] font-semibold tracking-[0.12em] text-[#8E8E93] uppercase select-none">
              SJ Kitchen CRM
            </span>
          </div>

          {/* Center — Search */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
              }}
              className="flex items-center justify-between w-56 px-3 py-1.5 rounded-full border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:border-[#C7C7CC] dark:hover:border-[#48484A] text-[11.5px] font-medium select-none cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3 w-3" />
                <span>Cari affiliate, deal...</span>
              </div>
              <kbd className="hidden lg:inline-flex text-[8.5px] font-mono bg-[#F2F2F7] dark:bg-[#1E1E1E] border border-[#E5E5EA] dark:border-[#38383A] px-1.5 py-0.5 rounded-md text-[#8E8E93]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="hidden lg:flex items-center gap-1.5 bg-[#34C759]/8 border border-[#34C759]/20 text-[#1A7A35] dark:text-[#34C759] px-2.5 py-1 rounded-full text-[9.5px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34C759] animate-pulse" />
              Live
            </div>

            <button
              onClick={toggleTheme}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-all cursor-pointer"
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            >
              {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative h-8 w-8 flex items-center justify-center rounded-full border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-all cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                {(notifications.length + aiAlerts.length) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-[#FF3B30] rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                    {notifications.length + aiAlerts.length}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-10 w-80 rounded-[18px] border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-4 z-50 space-y-3 fade-scale">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#F2F2F7] dark:border-[#38383A]">
                    <div className="flex bg-[#F2F2F7] dark:bg-[#1E1E1E] p-0.5 rounded-full">
                      <button
                        onClick={() => setInboxTab('inbox')}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          inboxTab === 'inbox' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-2xs' : 'text-[#8E8E93]'
                        }`}
                      >
                        Inbox {notifications.length > 0 && `(${notifications.length})`}
                      </button>
                      <button
                        onClick={() => setInboxTab('ai')}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          inboxTab === 'ai' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white shadow-2xs' : 'text-[#8E8E93]'
                        }`}
                      >
                        <Sparkles className="h-2.5 w-2.5" /> AI {aiAlerts.length > 0 && `(${aiAlerts.length})`}
                      </button>
                    </div>
                    {inboxTab === 'inbox' && notifications.length > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] text-[#007AFF] hover:underline font-semibold cursor-pointer">
                        Bersihkan
                      </button>
                    )}
                    {inboxTab === 'ai' && (
                      <Link href="/ai" onClick={() => setShowDropdown(false)} className="text-[10px] text-[#007AFF] hover:underline font-semibold">
                        Workspace
                      </Link>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    {inboxTab === 'inbox' ? (
                      notifications.length === 0 ? (
                        <div className="text-center py-8">
                          <Bell className="h-7 w-7 text-[#D1D1D6] mx-auto mb-2" />
                          <p className="text-[11px] text-[#8E8E93]">Tidak ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="group relative bg-[#F5F5F7] dark:bg-[#1E1E1E] rounded-xl p-3 flex items-start gap-2.5">
                            <div className="flex-1 pr-5">
                              <span className="text-[11px] font-semibold text-[#1D1D1F] dark:text-white block">{n.title}</span>
                              <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] leading-snug mt-0.5">{n.message}</p>
                            </div>
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="absolute right-2 top-2 p-1 rounded-full bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] text-[#8E8E93] hover:text-[#007AFF] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))
                      )
                    ) : aiAlerts.length === 0 ? (
                      <div className="text-center py-8">
                        <Sparkles className="h-7 w-7 text-[#D1D1D6] mx-auto mb-2" />
                        <p className="text-[11px] text-[#8E8E93]">Tidak ada AI alert</p>
                      </div>
                    ) : (
                      aiAlerts.map(a => {
                        const content = (
                          <div className={`rounded-xl p-3 border ${
                            a.priority === 'critical' ? 'border-[#FF3B30]/25 bg-[#FF3B30]/5' :
                            a.priority === 'high' ? 'border-[#FF9F0A]/25 bg-[#FF9F0A]/5' :
                            'border-[#007AFF]/20 bg-[#007AFF]/5'
                          }`}>
                            <span className="text-[11px] font-semibold text-[#1D1D1F] dark:text-white block">{a.title}</span>
                            <p className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] leading-snug mt-0.5">{a.message}</p>
                          </div>
                        )
                        return a.href ? (
                          <Link key={a.id} href={a.href} onClick={() => setShowDropdown(false)}>{content}</Link>
                        ) : (
                          <div key={a.id}>{content}</div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-5 pb-24 md:p-7 md:pb-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-[#E5E5EA] dark:border-[#38383A] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md flex items-center justify-around px-4">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#8E8E93] hover:text-[#007AFF] transition-colors">
          <Home className="h-[22px] w-[22px]" />
          <span className="text-[9px] font-semibold">Home</span>
        </Link>
        <Link href="/affiliates" className="flex flex-col items-center gap-1 text-[#8E8E93] hover:text-[#007AFF] transition-colors">
          <Search className="h-[22px] w-[22px]" />
          <span className="text-[9px] font-semibold">Listing</span>
        </Link>
        <Link href="/contact" className="flex flex-col items-center gap-1 text-[#8E8E93] hover:text-[#007AFF] transition-colors">
          <MessageSquare className="h-[22px] w-[22px]" />
          <span className="text-[9px] font-semibold">Contact</span>
        </Link>
        <Link href="/progress" className="flex flex-col items-center gap-1 text-[#8E8E93] hover:text-[#007AFF] transition-colors">
          <Clock className="h-[22px] w-[22px]" />
          <span className="text-[9px] font-semibold">Progress</span>
        </Link>
        <Link href="/audit-log" className="flex flex-col items-center gap-1 text-[#8E8E93] hover:text-[#007AFF] transition-colors">
          <ShieldAlert className="h-[22px] w-[22px]" />
          <span className="text-[9px] font-semibold">Logs</span>
        </Link>
      </div>
    </div>
  )
}
