'use client'
/**
 * Shared API hooks — the SINGLE SOURCE OF TRUTH for every data fetch in the app.
 *
 * Every page uses these hooks instead of raw fetch() + useState + useEffect.
 * This means:
 *  1. Cache invalidation in one place refreshes ALL pages using that key.
 *  2. No duplicate network requests for the same data.
 *  3. Consistent loading/error handling across the entire app.
 *
 * Cache key naming convention:
 *  ['entity']             — full list without filters
 *  ['entity', { ...filters }] — filtered/paginated list
 *  ['entity', 'id', id]   — single record
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Cache Keys (export for invalidation use) ────────────────────────────────

export const QUERY_KEYS = {
  dashboard: ['dashboard'] as const,
  affiliates: (params?: Record<string, string>) => params ? ['affiliates', params] : ['affiliates'] as const,
  affiliateById: (id: string) => ['affiliates', 'id', id] as const,
  campaigns: ['campaigns'] as const,
  deals: (params?: Record<string, string>) => params ? ['deals', params] : ['deals'] as const,
  sow: (params?: Record<string, string>) => params ? ['sow', params] : ['sow'] as const,
  performance: (params?: Record<string, string>) => params ? ['performance', params] : ['performance'] as const,
  reminders: (completed?: boolean) => ['reminders', { completed }] as const,
  calendar: (year: number, month: number) => ['calendar', year, month] as const,
  users: ['users'] as const,
  reports: ['reports'] as const,
  blacklist: ['blacklist'] as const,
  notifications: ['notifications'] as const,
} as const

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  const json = await res.json()
  if (json.success === false) throw new Error(json.message || 'API error')
  return json
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => apiFetch<any>('/api/dashboard'),
  })
}

// ─── Affiliates ───────────────────────────────────────────────────────────────

export function useAffiliates(params?: Record<string, string>) {
  const search = params ? '?' + new URLSearchParams(params).toString() : ''
  return useQuery({
    queryKey: QUERY_KEYS.affiliates(params),
    queryFn: () => apiFetch<{ data: any[]; total: number; page: number; totalPages: number }>(`/api/affiliates${search}`),
  })
}

export function useAffiliateById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.affiliateById(id),
    queryFn: () => apiFetch<{ data: any }>(`/api/affiliates/${id}`),
    enabled: !!id,
  })
}

export function useKanbanAffiliates() {
  return useQuery({
    queryKey: ['affiliates', 'kanban'],
    queryFn: () => apiFetch<{ data: any[] }>('/api/affiliates/kanban'),
  })
}

// Mutation: Update affiliate status (invalidates affiliates + dashboard)
export function useUpdateAffiliateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affiliates'] })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports })
    },
  })
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useCampaigns() {
  return useQuery({
    queryKey: QUERY_KEYS.campaigns,
    queryFn: () => apiFetch<{ data: any[] }>('/api/campaigns'),
  })
}

// Mutation: Create campaign
export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) =>
      fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.campaigns })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
    },
  })
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export function useDeals(params?: Record<string, string>) {
  const search = params ? '?' + new URLSearchParams(params).toString() : ''
  return useQuery({
    queryKey: QUERY_KEYS.deals(params),
    queryFn: () => apiFetch<{ data: any[] }>(`/api/deals${search}`),
  })
}

// Mutation: Update deal (SOW progress, video links, status)
export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) =>
      fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['sow'] })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports })
      qc.invalidateQueries({ queryKey: ['performance'] })
    },
  })
}

// ─── SOW ──────────────────────────────────────────────────────────────────────

export function useSOW(params?: Record<string, string>) {
  const search = params ? '?' + new URLSearchParams(params).toString() : ''
  return useQuery({
    queryKey: QUERY_KEYS.sow(params),
    queryFn: () => apiFetch<{ data: any }>(`/api/sow${search}`),
  })
}

// ─── Creator Performance ──────────────────────────────────────────────────────

export function usePerformance(params?: Record<string, string>) {
  const search = params ? '?' + new URLSearchParams(params).toString() : ''
  return useQuery({
    queryKey: QUERY_KEYS.performance(params),
    queryFn: () => apiFetch<{ data: any[] }>(`/api/performance${search}`),
  })
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export function useReminders(completed = false) {
  return useQuery({
    queryKey: QUERY_KEYS.reminders(completed),
    queryFn: () => apiFetch<{ data: any[] }>(`/api/reminders?completed=${completed}`),
    // Refetch reminders every 60 seconds in background
    refetchInterval: 60 * 1000,
  })
}

// Mutation: Mark reminder complete
export function useCompleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
    },
  })
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export function useCalendar(year: number, month: number) {
  return useQuery({
    queryKey: QUERY_KEYS.calendar(year, month),
    queryFn: () => apiFetch<{ data: any[] }>(`/api/calendar?year=${year}&month=${month}`),
    enabled: !!year && month >= 0,
  })
}

// ─── Users (PICs) ─────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => apiFetch<{ data: any[] }>('/api/users'),
    staleTime: 5 * 60 * 1000, // Users rarely change — cache for 5 minutes
  })
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function useReports() {
  return useQuery({
    queryKey: QUERY_KEYS.reports,
    queryFn: async () => {
      const [dashRes, repRes] = await Promise.all([
        apiFetch<any>('/api/dashboard'),
        apiFetch<any>('/api/reports'),
      ])
      return {
        stats: dashRes.stats,
        topCreators: repRes.topCreators || [],
        pics: repRes.pics || [],
        campaigns: repRes.campaigns || [],
      }
    },
  })
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

export function useBlacklist() {
  return useQuery({
    queryKey: QUERY_KEYS.blacklist,
    queryFn: () => apiFetch<{ data: any[] }>('/api/blacklist'),
  })
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: () => apiFetch<{ data: any[] }>('/api/notifications'),
    refetchInterval: 30 * 1000, // Poll every 30 seconds
  })
}
