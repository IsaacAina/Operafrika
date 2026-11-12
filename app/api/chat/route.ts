import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { processAiQuestion } from '@/lib/ai/query-engine'
import { checkChatRateLimit } from '@/lib/rate-limit'
import { saveChatMessage, getChatHistory } from '@/lib/chat'

/**
 * Zod validation schema for chat requests.
 */
const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Please enter a message or question for the assistant.')
    .max(1000, 'Message is too long. Please keep your question under 1,000 characters.'),
  branchId: z.string().trim().optional(),
})

// Jailbreak & prompt injection detection patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+override/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions)/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /jailbreak/i,
  /dan\s+mode/i,
]

/**
 * GET /api/chat
 * Retrieves saved chat conversation history for the authenticated user.
 */
export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
  }

  const history = await getChatHistory(sessionUser.id, 30)
  return NextResponse.json({ success: true, history })
}

/**
 * POST /api/chat
 * Sends a user prompt to the AI Assistant pipeline:
 * 1. Authenticates session user from server session.
 * 2. Enforces per-user rate limits (max 15 requests per minute).
 * 3. Applies strict Zod schema validation.
 * 4. Filters out prompt injection attempts.
 * 5. Queries verified PostgreSQL numbers first (RLS-guarded).
 * 6. Invokes Gemini to explain the pre-calculated numbers.
 * 7. Persists the conversation turn into the database.
 */
export async function POST(req: Request) {
  try {
    // -------------------------------------------------------------
    // Check 1: Authentication & Server Session
    // -------------------------------------------------------------
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to ask the assistant.' },
        { status: 401 },
      )
    }

    // -------------------------------------------------------------
    // Check 2: Rate Limiting
    // -------------------------------------------------------------
    const rateLimit = checkChatRateLimit(sessionUser.id, 15, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many chat requests. Please wait ${rateLimit.retryAfter || 60} seconds before sending another message.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          },
        },
      )
    }

    // -------------------------------------------------------------
    // Check 3: Zod Schema Validation
    // Accepts either `message` or `question` for broad compatibility.
    // -------------------------------------------------------------
    const rawBody = await req.json().catch(() => ({}))
    const normalizedInput = {
      message: typeof rawBody.message === 'string' ? rawBody.message : rawBody.question,
      branchId: rawBody.branchId,
    }

    const validation = chatRequestSchema.safeParse(normalizedInput)
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid chat request.'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { message, branchId: clientBranchId } = validation.data

    // -------------------------------------------------------------
    // Check 4: Safety & Prompt Injection Check
    // -------------------------------------------------------------
    const isSuspicious = PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message))
    if (isSuspicious) {
      const refusalAnswer =
        'I am your Operafrika business assistant and can only answer questions about your verified business sales, stock, expenses, and branch performance.'

      // Save refusal in chat history for audit
      await saveChatMessage({
        userId: sessionUser.id,
        businessId: sessionUser.businessId,
        branchId: clientBranchId,
        prompt: message,
        response: refusalAnswer,
        label: 'Insufficient Data',
      })

      return NextResponse.json({
        success: true,
        answer: refusalAnswer,
        label: 'Insufficient Data',
        suggestedQuestions: [
          'What are my total sales this month?',
          'Which items are currently low in stock?',
          'What is our total expense this week?',
        ],
      })
    }

    // -------------------------------------------------------------
    // Check 5: Business Resolution & Row-Level Security
    // -------------------------------------------------------------
    const business = await withRls(
      {
        role: toRlsRole(sessionUser.role),
        businessId: sessionUser.businessId,
        userId: sessionUser.id,
      },
      (tx) =>
        tx.business.findUnique({
          where: { id: sessionUser.businessId },
          select: { name: true, currency: true },
        }),
    )

    if (!business) {
      return NextResponse.json({ error: 'Business account not found or access revoked.' }, { status: 404 })
    }

    // -------------------------------------------------------------
    // Check 6: Pre-Calculated Database Computation & Gemini Invocation
    // -------------------------------------------------------------
    const result = await processAiQuestion(
      {
        userId: sessionUser.id,
        businessId: sessionUser.businessId,
        role: sessionUser.role as 'OWNER' | 'MANAGER' | 'STAFF',
        branchId: clientBranchId,
        businessName: business.name,
        currency: business.currency,
      },
      message,
    )

    // -------------------------------------------------------------
    // Check 7: Persist Conversation Turn into Database
    // -------------------------------------------------------------
    await saveChatMessage({
      userId: sessionUser.id,
      businessId: sessionUser.businessId,
      branchId: clientBranchId,
      prompt: message,
      response: result.answer,
      label: result.label,
      dataSnapshot: result.dataSnapshot,
    })

    return NextResponse.json({
      success: true,
      answer: result.answer,
      label: result.label,
      dataSnapshot: result.dataSnapshot,
      suggestedQuestions: result.suggestedQuestions,
    })
  } catch (err: unknown) {
    console.error('[/api/chat Error]', err)
    return NextResponse.json(
      {
        error: 'Unable to process chat request. Core business records remain fully operational.',
      },
      { status: 500 },
    )
  }
}
