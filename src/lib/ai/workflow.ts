import prisma from '@/lib/prisma'
import type { WorkflowTask } from './types'

export type { WorkflowTask } from './types'

export async function generateWorkflowTasks(): Promise<WorkflowTask[]> {
  const now = new Date()
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const tasks: WorkflowTask[] = []

  const [followUps, reApproaches, sowDue, sowOverdue, pendingDeals, blacklistedRecent] = await Promise.all([
    prisma.reminder.findMany({
      where: { completed: false, dueDate: { lte: now }, type: { in: ['FOLLOW_UP', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] } },
      take: 10,
      orderBy: { dueDate: 'asc' },
      include: { affiliate: { select: { id: true, username: true } } },
    }),
    prisma.reminder.findMany({
      where: { completed: false, dueDate: { lte: now }, type: 'RE_APPROACH' },
      take: 5,
      orderBy: { dueDate: 'asc' },
      include: { affiliate: { select: { id: true, username: true } } },
    }),
    prisma.deal.findMany({
      where: {
        deletedAt: null,
        sowStatus: { not: 'Completed' },
        deadline: { gte: now, lte: todayEnd },
      },
      take: 5,
      include: { affiliate: { select: { id: true, username: true } } },
    }),
    prisma.deal.findMany({
      where: { deletedAt: null, sowStatus: 'Overdue' },
      take: 5,
      orderBy: { deadline: 'asc' },
      include: { affiliate: { select: { id: true, username: true } } },
    }),
    prisma.affiliate.findMany({
      where: { deletedAt: null, status: 'Belum Dihubungi' },
      take: 5,
      orderBy: { gmvCount: 'desc' },
      select: { id: true, username: true, gmv: true },
    }),
    prisma.affiliate.findMany({
      where: { status: 'Blacklist', deletedAt: null, blacklistDate: { gte: new Date(now.getTime() - 7 * 86400000) } },
      take: 3,
      select: { id: true, username: true, blacklistReason: true },
    }),
  ])

  for (const r of sowOverdue) {
    tasks.push({
      id: `sow-overdue-${r.id}`,
      priority: 1,
      category: 'sow',
      title: `SOW Overdue: @${r.affiliate.username}`,
      description: `Deal ${r.product} — deadline terlewati, segera follow up.`,
      dueDate: r.deadline?.toISOString(),
      affiliateUsername: r.affiliate.username,
      href: `/affiliates/${r.affiliate.id}`,
    })
  }

  for (const r of followUps) {
    if (!r.affiliate) continue
    tasks.push({
      id: `followup-${r.id}`,
      priority: 1,
      category: 'follow_up',
      title: `Follow Up: @${r.affiliate.username}`,
      description: `Reminder ${r.type.replace(/_/g, ' ')} jatuh tempo.`,
      dueDate: r.dueDate.toISOString(),
      affiliateUsername: r.affiliate.username,
      href: `/contact`,
    })
  }

  for (const d of sowDue) {
    tasks.push({
      id: `sow-due-${d.id}`,
      priority: 2,
      category: 'sow',
      title: `SOW Due Today: @${d.affiliate.username}`,
      description: `Deal ${d.product} — deadline hari ini.`,
      dueDate: d.deadline?.toISOString(),
      affiliateUsername: d.affiliate.username,
      href: `/affiliates/${d.affiliate.id}`,
    })
  }

  for (const r of reApproaches) {
    if (!r.affiliate) continue
    tasks.push({
      id: `reapproach-${r.id}`,
      priority: 2,
      category: 're_approach',
      title: `Re-Approach: @${r.affiliate.username}`,
      description: 'Creator siap dihubungi kembali setelah periode no response.',
      dueDate: r.dueDate.toISOString(),
      affiliateUsername: r.affiliate.username,
      href: `/contact`,
    })
  }

  for (const a of pendingDeals) {
    tasks.push({
      id: `pending-${a.id}`,
      priority: 3,
      category: 'deal',
      title: `Outreach: @${a.username}`,
      description: `Belum dihubungi · GMV ${a.gmv || 'N/A'} — potensi tinggi.`,
      affiliateUsername: a.username,
      href: `/contact`,
    })
  }

  for (const a of blacklistedRecent) {
    tasks.push({
      id: `blacklist-${a.id}`,
      priority: 3,
      category: 'blacklist',
      title: `Review Blacklist: @${a.username}`,
      description: a.blacklistReason || 'Creator baru masuk blacklist minggu ini.',
      affiliateUsername: a.username,
      href: `/blacklist`,
    })
  }

  tasks.sort((a, b) => a.priority - b.priority)
  return tasks.slice(0, 12)
}

export function groupTasksByPriority(tasks: WorkflowTask[]) {
  return {
    priority1: tasks.filter(t => t.priority === 1),
    priority2: tasks.filter(t => t.priority === 2),
    priority3: tasks.filter(t => t.priority === 3),
  }
}
