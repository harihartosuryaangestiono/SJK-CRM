'use client'

import React, { useState, useEffect } from 'react'
import { useCalendar } from '@/lib/api-hooks'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Video,
  Tv,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  type: 'follow-up' | 'video-deadline' | 'live-schedule' | 'campaign-launch'
  date: string // ISO string
  details: string
  creator?: string
  source: 'reminder' | 'deal' | 'campaign'
}

// ─── Event colors and icons ───────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: React.ComponentType<any>; bg: string; border: string; text: string; label: string }> = {
  'follow-up': {
    icon: MessageCircle,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'Follow Up',
  },
  'video-deadline': {
    icon: Video,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    label: 'Deadline',
  },
  'live-schedule': {
    icon: Tv,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Deal',
  },
  'campaign-launch': {
    icon: AlertCircle,
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    label: 'Campaign',
  },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Fetch real calendar events from the database
  const { data, isLoading, refetch } = useCalendar(year, month)
  const events: CalendarEvent[] = data?.data || []

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))

  // Build calendar grid
  const getDaysInMonth = () => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDayIndex; i++) days.push(null)
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d))
    return days
  }

  const days = getDaysInMonth()
  const today = new Date()

  // Events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      const ed = new Date(e.date)
      return (
        ed.getFullYear() === date.getFullYear() &&
        ed.getMonth() === date.getMonth() &&
        ed.getDate() === date.getDate()
      )
    })
  }

  // Events for selected date
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] py-8 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Kalender</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Jadwal follow-up, SOW deadline, dan campaign — semua dari database
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#38383A] rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#38383A] overflow-hidden">

            {/* Month navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2C2C2E]">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-sm text-gray-900 dark:text-white capitalize">{monthName}</span>
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              </div>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#2C2C2E]">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                <div key={d} className="text-center py-2 text-[11px] font-bold text-gray-400 dark:text-gray-600 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square p-1" />
                }
                const dayEvents = getEventsForDate(day)
                const isToday = day.toDateString() === today.toDateString()
                const isSelected = selectedDate?.toDateString() === day.toDateString()

                return (
                  <button
                    key={day.toDateString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square p-1 flex flex-col items-center gap-0.5 rounded-lg m-0.5 transition-all hover:bg-gray-50 dark:hover:bg-[#2C2C2E] ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-400 dark:ring-blue-600' : ''
                    }`}
                  >
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {/* Event dots */}
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map(e => {
                        const config = EVENT_CONFIG[e.type] || EVENT_CONFIG['follow-up']
                        return (
                          <span
                            key={e.id}
                            className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-').split(' ')[0]}`}
                          />
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-gray-400 font-bold">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sidebar: Events for selected date */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#38383A] p-4">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Keterangan</div>
              <div className="space-y-2">
                {Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`p-1 rounded-md ${cfg.bg} ${cfg.border} border`}>
                        <Icon className={`w-3 h-3 ${cfg.text}`} />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Events panel */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#38383A] p-4">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {selectedDate
                  ? selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                  : 'Pilih Tanggal'}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Tidak ada jadwal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map(event => {
                    const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG['follow-up']
                    const Icon = cfg.icon
                    const eventDate = new Date(event.date)

                    return (
                      <div
                        key={event.id}
                        className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0`}>
                            <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${cfg.text} truncate`}>{event.title}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {event.details}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">
                              {eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {cfg.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* This month summary */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-[#38383A] p-4">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Bulan Ini — {events.length} Event
              </div>
              <div className="space-y-1.5">
                {Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
                  const count = events.filter(e => e.type === key).length
                  if (count === 0) return null
                  const Icon = cfg.icon
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3 h-3 ${cfg.text}`} />
                        <span className="text-gray-600 dark:text-gray-300">{cfg.label}</span>
                      </div>
                      <span className={`font-bold ${cfg.text}`}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
