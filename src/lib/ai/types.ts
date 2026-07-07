export type CopilotPageContext = {
  page?: string
  affiliateId?: string
  dealId?: string
}

export type CopilotStructuredResponse = {
  summary: string
  analysis: string
  insight: string
  recommendation: string
  nextAction: string
}

export type CopilotMessageRole = 'user' | 'assistant' | 'system'

export type CRMContextSnapshot = {
  generatedAt: string
  dashboard: Record<string, unknown>
  additional?: Record<string, unknown>
}

export type HealthCategory = 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical'

export type HealthScoreResult = {
  score: number
  category: HealthCategory
  factors: {
    activity: number
    responseSpeed: number
    dealHistory: number
    revenue: number
    videoCompletion: number
    sowCompletion: number
    communication: number
    growth: number
  }
  narrative: string
}

export const HEALTH_CATEGORY_COLORS: Record<HealthCategory, string> = {
  Excellent: 'text-[#34C759] bg-[#34C759]/10 border-[#34C759]/25',
  Good: 'text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/25',
  Fair: 'text-[#FF9F0A] bg-[#FF9F0A]/10 border-[#FF9F0A]/25',
  'Needs Attention': 'text-[#FF6723] bg-[#FF6723]/10 border-[#FF6723]/25',
  Critical: 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/25',
}

export type AIInsight = {
  id: string
  type: 'positive' | 'warning' | 'critical' | 'info'
  title: string
  message: string
  metric?: string
  action?: string
  href?: string
}

export type WorkflowTask = {
  id: string
  priority: 1 | 2 | 3
  category: 'follow_up' | 're_approach' | 'sow' | 'reminder' | 'deal' | 'blacklist' | 'campaign'
  title: string
  description: string
  dueDate?: string
  affiliateUsername?: string
  href: string
}

export type ProactiveAlert = {
  id: string
  type: 'insight' | 'workflow' | 'anomaly' | 'analytics'
  priority: 'critical' | 'high' | 'medium'
  title: string
  message: string
  href?: string
  createdAt: string
}

export type MetricComparison = {
  label: string
  current: number
  previous: number
  changePct: number
  trend: 'up' | 'down' | 'flat'
  unit?: string
}

export type AnomalyType =
  | 'duplicate_wa'
  | 'duplicate_profile'
  | 'missing_data'
  | 'inactive_creator'
  | 'missing_video'
  | 'overdue_sow'
  | 'low_response'
  | 'incomplete_campaign'

export type Anomaly = {
  id: string
  type: AnomalyType
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  count: number
  entities?: { id: string; label: string; href: string }[]
  href?: string
}

export type Prediction = {
  id: string
  type: 'revenue' | 'gmv' | 'deal_probability' | 'sow_completion' | 'churn' | 'top_performer'
  title: string
  value: string
  confidence: 'high' | 'medium' | 'low'
  confidencePct: number
  reasoning: string
  affiliateUsername?: string
  href?: string
}
