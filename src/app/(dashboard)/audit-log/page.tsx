'use client'

import React, { useEffect, useState } from 'react'
import { Search, ShieldAlert, ChevronLeft, ChevronRight, User, Calendar, Cpu, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type AuditLog = {
  id: string
  userId: string | null
  userName: string | null
  createdAt: string
  entity: string
  entityId: string
  action: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  browser: string | null
}

type UsersList = {
  id: string
  name: string
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<UsersList[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [entity, setEntity] = useState('all')
  const [userIdFilter, setUserIdFilter] = useState('all')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search,
        action,
        entity,
        userId: userIdFilter
      })
      const res = await fetch(`/api/audit-logs?${queryParams}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
        setTotalPages(json.pagination.totalPages)
      } else {
        toast.error('Failed to fetch audit logs')
      }
    } catch (err) {
      toast.error('Error fetching audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (json.success) {
        setUsers(json.data)
      }
    } catch (err) {}
  }

  useEffect(() => {
    fetchLogs()
  }, [page, action, entity, userIdFilter])

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const formatIndonesianDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionColor = (act: string) => {
    switch (act) {
      case 'CREATE':
        return 'bg-[#EDFAF2] text-[#14532D] border-[#BBF7D0] dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900/30'
      case 'DELETE':
        return 'bg-[#FFF1F0] text-[#991B1B] border-[#FCA5A5] dark:bg-red-950/40 dark:text-red-450 dark:border-red-900/30'
      case 'RESTORE':
        return 'bg-[#F0FDFA] text-[#134E4A] border-[#99F6E4] dark:bg-teal-950/40 dark:text-teal-450'
      case 'IMPORT':
      case 'EXPORT':
        return 'bg-[#F5F0FF] text-[#5B21B6] border-[#DDD6FE] dark:bg-purple-950/40 dark:text-purple-450'
      case 'LOGIN':
      case 'LOGOUT':
        return 'bg-[#FFF8E6] text-[#92400E] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-450'
      default:
        return 'bg-blue-50 text-blue-750 border-blue-100 dark:bg-blue-950/40 dark:text-blue-450'
    }
  }

  const renderValuePreview = (val: string | null) => {
    if (!val) return '-'
    try {
      const obj = JSON.parse(val)
      return (
        <div className="text-[11px] font-mono max-w-xs overflow-hidden truncate whitespace-nowrap bg-[#F5F5F7] dark:bg-zinc-800 p-1.5 rounded border border-[#E5E5EA] dark:border-zinc-700 text-[#6E6E73] dark:text-zinc-400">
          {Object.entries(obj)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}
        </div>
      )
    } catch {
      return <span className="text-[#6E6E73] dark:text-zinc-400 text-xs font-mono">{val}</span>
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E]/60 pb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-[#8E8E93]" />
            Audit Logs System
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-relaxed">
            Catatan aktivitas immutable untuk menjamin keamanan, kepatuhan (compliance), dan riwayat PIC.
          </p>
        </div>
      </div>

      {/* Filters & Search Control */}
      <div className="apple-card p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Cari kata kunci, IP, browser, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-xs bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-lg text-[#1D1D1F] dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter User */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 px-3 py-1.5 rounded-lg text-sm">
            <User className="h-3.5 w-3.5 text-[#8E8E93]" />
            <select
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value)
                setPage(1)
              }}
              className="bg-transparent text-xs font-semibold text-[#6E6E73] dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua User</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-white text-[#1D1D1F]">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Entity */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 px-3 py-1.5 rounded-lg text-sm">
            <Calendar className="h-3.5 w-3.5 text-[#8E8E93]" />
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value)
                setPage(1)
              }}
              className="bg-transparent text-xs font-semibold text-[#6E6E73] dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Entity</option>
              <option value="Affiliate" className="bg-white text-[#1D1D1F]">Creator (Affiliate)</option>
              <option value="Campaign" className="bg-white text-[#1D1D1F]">Campaign</option>
              <option value="Deal" className="bg-white text-[#1D1D1F]">Deal (Milestone)</option>
              <option value="User" className="bg-white text-[#1D1D1F]">User</option>
            </select>
          </div>

          {/* Filter Action */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 px-3 py-1.5 rounded-lg text-sm">
            <Cpu className="h-3.5 w-3.5 text-[#8E8E93]" />
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
              className="bg-transparent text-xs font-semibold text-[#6E6E73] dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Aksi</option>
              <option value="CREATE" className="bg-white text-[#1D1D1F]">CREATE</option>
              <option value="UPDATE" className="bg-white text-[#1D1D1F]">UPDATE</option>
              <option value="DELETE" className="bg-white text-[#1D1D1F]">DELETE</option>
              <option value="RESTORE" className="bg-white text-[#1D1D1F]">RESTORE</option>
              <option value="UPDATE_STATUS" className="bg-white text-[#1D1D1F]">STATUS CHANGE</option>
              <option value="UPDATE_PIC" className="bg-white text-[#1D1D1F]">PIC ASSIGN</option>
              <option value="IMPORT" className="bg-white text-[#1D1D1F]">IMPORT DATA</option>
              <option value="EXPORT" className="bg-white text-[#1D1D1F]">EXPORT DATA</option>
              <option value="LOGIN" className="bg-white text-[#1D1D1F]">LOGIN</option>
              <option value="LOGOUT" className="bg-white text-[#1D1D1F]">LOGOUT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="apple-card p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 text-[#007AFF] animate-spin" />
            <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-semibold tracking-wide">Memuat catatan log...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldAlert className="h-10 w-10 text-zinc-400 mb-2" />
                  <p className="text-sm text-zinc-500 font-medium">Tidak ada log aktivitas ditemukan</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-[#6E6E73] dark:text-[#8E8E93] font-semibold uppercase tracking-wider select-none">
                      <th className="pb-3 pr-4">Waktu</th>
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4">Aksi</th>
                      <th className="pb-3 pr-4">Entity</th>
                      <th className="pb-3 pr-4">Entity ID</th>
                      <th className="pb-3 pr-4">Old Value</th>
                      <th className="pb-3 pr-4">New Value</th>
                      <th className="pb-3 pr-4">IP Address</th>
                      <th className="pb-3">Browser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-[#F2F2F7] dark:border-zinc-800/40 hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/20 group">
                        <td className="py-4 pr-4 whitespace-nowrap text-[#6E6E73] dark:text-zinc-400">
                          {formatIndonesianDate(log.createdAt)}
                        </td>
                        <td className="py-4 pr-4 font-semibold text-[#1D1D1F] dark:text-white">
                          {log.userName || 'System'}
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-[#1D1D1F] dark:text-zinc-200 font-medium">{log.entity}</td>
                        <td className="py-4 pr-4 font-mono text-[10px] text-[#8E8E93] max-w-[100px] truncate" title={log.entityId}>
                          {log.entityId}
                        </td>
                        <td className="py-4 pr-4">{renderValuePreview(log.oldValue)}</td>
                        <td className="py-4 pr-4">{renderValuePreview(log.newValue)}</td>
                        <td className="py-4 pr-4 font-mono text-[11px] text-[#6E6E73] dark:text-zinc-400">{log.ipAddress || '-'}</td>
                        <td className="py-4 text-[10px] text-[#8E8E93] max-w-[120px] truncate" title={log.browser || ''}>
                          {log.browser || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#F2F2F7] dark:border-[#2C2C2E] pt-4 text-xs text-[#6E6E73] dark:text-[#8E8E93] select-none">
                <div>
                  Menampilkan halaman <span className="font-semibold text-[#1D1D1F] dark:text-white">{page}</span> dari <span className="font-semibold text-[#1D1D1F] dark:text-white">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="apple-btn-secondary h-8 w-8 !p-0 !min-w-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="apple-btn-secondary h-8 w-8 !p-0 !min-w-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
