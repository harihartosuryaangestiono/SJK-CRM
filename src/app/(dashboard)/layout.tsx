import React from 'react'
import { SidebarProvider } from '@/components/sidebar-context'
import DashboardLayoutClient from '@/components/dashboard-layout-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SJ Kitchen CRM - Affiliate Management',
  description: 'Enterprise CRM Suite for SJ Kitchen Affiliate Marketing and Operations.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </SidebarProvider>
  )
}
