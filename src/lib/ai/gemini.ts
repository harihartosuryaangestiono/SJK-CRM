import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CopilotStructuredResponse } from './types'

const DEFAULT_MODEL = 'gemini-2.5-flash'
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-3.5-flash']

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

export function getGeminiModel(modelName?: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const ai = new GoogleGenerativeAI(apiKey)
  return ai.getGenerativeModel({ model: modelName || getGeminiModelName() })
}

export function parseStructuredResponse(text: string): CopilotStructuredResponse | null {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<CopilotStructuredResponse>
    if (!parsed.summary) return null
    return {
      summary: parsed.summary || '',
      analysis: parsed.analysis || '',
      insight: parsed.insight || '',
      recommendation: parsed.recommendation || '',
      nextAction: parsed.nextAction || '',
    }
  } catch {
    return null
  }
}

export function structuredToMarkdown(s: CopilotStructuredResponse): string {
  return `**Ringkasan:** ${s.summary}

**Analisis:** ${s.analysis}

**Insight:** ${s.insight}

**Rekomendasi:** ${s.recommendation}

**Langkah Selanjutnya:** ${s.nextAction}`
}

async function generateWithModel(prompt: string, modelName: string): Promise<string> {
  const model = getGeminiModel(modelName)
  if (!model) throw new Error('Gemini model unavailable')
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export async function generateCopilotResponse(prompt: string): Promise<{
  text: string
  structured: CopilotStructuredResponse | null
  provider: 'gemini' | 'fallback'
  modelUsed?: string
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { text: '', structured: null, provider: 'fallback' }
  }

  const modelsToTry = [getGeminiModelName(), ...FALLBACK_MODELS.filter(m => m !== getGeminiModelName())]

  for (const modelName of modelsToTry) {
    try {
      const text = await generateWithModel(prompt, modelName)
      const structured = parseStructuredResponse(text)
      return {
        text: structured ? structuredToMarkdown(structured) : text,
        structured,
        provider: 'gemini',
        modelUsed: modelName,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`Gemini model ${modelName} failed:`, msg.slice(0, 200))
    }
  }

  return { text: '', structured: null, provider: 'fallback' }
}
