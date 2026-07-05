'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { type ReactNode } from 'react'

/**
 * Client-side wrapper that provides TanStack Query context.
 * Must be a separate 'use client' component since the root layout is a Server Component.
 */
export default function Providers({ children }: { children: ReactNode }) {
  // getQueryClient() returns a singleton — same instance across all pages
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
