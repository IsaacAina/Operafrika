/**
 * Operafrika Internal AI Service Layer (Gemini Provider)
 *
 * Adheres strictly to .agent/rules/ai-and-vector.md:
 * 1. The AI model only explains already-computed database results. It NEVER generates
 *    or hallucinates financial figures.
 * 2. Every AI answer is labeled as one of: Calculated Fact, Estimate, or Insufficient Data.
 * 3. Fixed system instruction restricts it to the provided data and refuses off-topic questions.
 * 4. If the AI service fails, is missing credentials, or times out, a deterministic
 *    fallback message is returned so core business records remain 100% usable.
 */

import { explainBusinessData } from '@/lib/gemini'

export interface GeminiExplanationInput {
  question: string
  intent: string
  label: 'Calculated Fact' | 'Estimate' | 'Insufficient Data'
  currency: string
  businessName: string
  role: string
  dataSummary: string
  dataSnapshot?: Record<string, unknown>
}

export async function generateAiExplanation(input: GeminiExplanationInput): Promise<string> {
  return explainBusinessData({
    businessName: input.businessName,
    userRole: input.role,
    currency: input.currency,
    question: input.question,
    classification: input.label,
    verifiedDataSummary: input.dataSummary,
    fallbackText: input.dataSummary,
  })
}
