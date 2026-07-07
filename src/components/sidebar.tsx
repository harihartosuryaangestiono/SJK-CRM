'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Database,
  MessageSquare,
  KanbanSquare,
  Handshake,
  Award,
  BarChart3,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  LayoutGrid,
  Trash2,
  ShieldAlert,
  TrendingUp,
  ClipboardList,
  Sparkles
} from 'lucide-react'
import { useSidebar } from '@/components/sidebar-context'

interface UserState { name: string; email: string; role: string }

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Affiliate Listing', icon: Database, href: '/affiliates' },
      { label: 'Contact Hub', icon: MessageSquare, href: '/contact' },
      { label: 'AI Copilot', icon: Sparkles, href: '/ai' },
      { label: 'Progress Monitor', icon: KanbanSquare, href: '/progress' },
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Deal Affiliate', icon: Handshake, href: '/deals' },
      { label: 'SOW Tracker', icon: ClipboardList, href: '/sow' },
      { label: 'Campaigns', icon: Award, href: '/campaigns' },
      { label: 'Creator Performance', icon: TrendingUp, href: '/performance' },
      { label: 'Reports', icon: BarChart3, href: '/reports' },
      { label: 'Calendar', icon: CalendarIcon, href: '/calendar' },
    ]
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', icon: SettingsIcon, href: '/settings' },
      { label: 'Blacklist Creator', icon: ShieldAlert, href: '/blacklist' },
      { label: 'Audit Logs', icon: ShieldAlert, href: '/audit-log' },
      { label: 'Trash Bin', icon: Trash2, href: '/trash' },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isCollapsed, toggle } = useSidebar()
  const [user, setUser] = useState<UserState | null>(null)

  useEffect(() => {
    fetch('/api/auth')
      .then(res => { if (res.ok) return res.json(); throw new Error('Unauthorized') })
      .then(data => { if (data.authenticated) setUser(data.user) })
      .catch(() => router.push('/login'))
  }, [router])

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await fetch('/api/auth', { method: 'DELETE' })
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <aside
      className={`fixed top-3 left-3 z-20 h-[calc(100vh-1.5rem)] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-white rounded-[20px] shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-[#E5E5EA] dark:border-[#38383A] transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between overflow-hidden ${
        isCollapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex h-[56px] items-center justify-between px-3.5 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-[10px] bg-[#007AFF] flex items-center justify-center shrink-0">
              <LayoutGrid className="h-4 w-4 text-white stroke-[2]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate leading-tight">
                <span className="font-bold text-[13px] tracking-tight text-[#1D1D1F] dark:text-white">SJ Kitchen</span>
                <span className="text-[10px] text-[#8E8E93] font-medium">CRM Affiliate</span>
              </div>
            )}
          </div>
          <button
            onClick={toggle}
            className="hidden md:flex h-5 w-5 items-center justify-center rounded-full text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="p-2.5 space-y-4 mt-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!isCollapsed && (
                <div className="px-2.5 pb-1.5 text-[9px] font-bold text-[#8E8E93] uppercase tracking-widest select-none">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[12.5px] font-medium transition-all relative group ${
                        isActive
                          ? 'bg-[#007AFF]/[0.08] text-[#007AFF] dark:bg-[#007AFF]/20 dark:text-[#4DB8FF] font-semibold'
                          : 'text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#007AFF] dark:text-[#4DB8FF]' : 'text-[#8E8E93] dark:text-[#6E6E73] group-hover:text-[#1D1D1F] dark:group-hover:text-white'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {isCollapsed && (
                        <div className="absolute left-[60px] z-50 rounded-lg bg-[#1D1D1F] dark:bg-white px-2.5 py-1 text-[11px] text-white dark:text-[#1D1D1F] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-md font-semibold">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-2.5 border-t border-[#F2F2F7] dark:border-[#2C2C2E]">
        <div className={`flex items-center justify-between gap-2 rounded-[12px] p-2.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-7 w-7 rounded-[8px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] flex items-center justify-center shrink-0">
              <UserIcon className="h-3.5 w-3.5 text-[#6E6E73] dark:text-[#8E8E93]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate leading-tight">
                <span className="text-[11.5px] font-semibold text-[#1D1D1F] dark:text-white truncate">{user?.name || '...'}</span>
                <span className="text-[9.5px] text-[#8E8E93] font-medium uppercase tracking-wide">{user?.role || 'Staff'}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="text-[#8E8E93] hover:text-[#FF3B30] dark:hover:text-[#FF453A] p-1.5 rounded-full hover:bg-[#FF3B30]/8 transition-all cursor-pointer"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
