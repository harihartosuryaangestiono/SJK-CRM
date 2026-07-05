'use client'
import { QueryClient } from '@tanstack/react-query'

// Singleton QueryClient — shared across the entire app.
// This means invalidating 'affiliates' in one page immediately
// refreshes data in every other mounted component using that key.
let client: QueryClient | null = null

export function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          // Data considered fresh for 30 seconds — avoids duplicate network requests
          staleTime: 30 * 1000,
          // Keep unused data in cache for 5 minutes
          gcTime: 5 * 60 * 1000,
          // Retry once on network errors
          retry: 1,
          // Don't refetch on window focus (prevents flash on tab switch)
          refetchOnWindowFocus: false,
        },
      },
    })
  }
  return client
}
