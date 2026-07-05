'use client'
/**
 * useRealtimeSync — Supabase Realtime subscription hook
 *
 * Subscribes to database table changes and invalidates TanStack Query
 * cache keys automatically, so all pages see live updates without
 * requiring a manual page refresh.
 *
 * Mount this once at the dashboard layout level.
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { QUERY_KEYS } from '@/lib/api-hooks'

export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Guard: don't connect if Supabase env vars aren't configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Realtime] Supabase env vars not set — skipping realtime subscription')
      return
    }

    const supabase = createClient()

    // Listen to affiliate table changes → invalidate affiliates + dashboard
    const affiliatesChannel = supabase
      .channel('affiliates-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Affiliate' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['affiliates'] })
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reports })
        }
      )
      .subscribe()

    // Listen to deal table changes → invalidate deals + SOW + performance + dashboard
    const dealsChannel = supabase
      .channel('deals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Deal' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['deals'] })
          queryClient.invalidateQueries({ queryKey: ['sow'] })
          queryClient.invalidateQueries({ queryKey: ['performance'] })
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
          queryClient.invalidateQueries({ queryKey: ['calendar'] })
        }
      )
      .subscribe()

    // Listen to reminder changes → invalidate reminders + dashboard + calendar
    const remindersChannel = supabase
      .channel('reminders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Reminder' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reminders'] })
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
          queryClient.invalidateQueries({ queryKey: ['calendar'] })
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications })
        }
      )
      .subscribe()

    // Listen to notification changes → invalidate notifications
    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Notification' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications })
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(affiliatesChannel)
      supabase.removeChannel(dealsChannel)
      supabase.removeChannel(remindersChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [queryClient])
}
