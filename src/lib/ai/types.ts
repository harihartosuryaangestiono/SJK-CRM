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
