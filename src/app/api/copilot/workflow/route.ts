import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateWorkflowTasks, groupTasksByPriority } from '@/lib/ai/workflow'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const tasks = await generateWorkflowTasks()
    const grouped = groupTasksByPriority(tasks)

    return NextResponse.json({
      success: true,
      data: tasks,
      grouped,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message: 'Failed to generate workflow', error: msg }, { status: 500 })
  }
}
