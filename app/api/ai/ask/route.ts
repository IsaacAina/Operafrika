import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { processAiQuestion } from '@/lib/ai/query-engine'

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const branchId = typeof body.branchId === 'string' && body.branchId.trim() ? body.branchId.trim() : undefined

    if (!question) {
      return NextResponse.json({ error: 'Please provide a question for the assistant.' }, { status: 400 })
    }

    // Resolve business info and verify account state
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
      return NextResponse.json({ error: 'Business account not found.' }, { status: 404 })
    }

    const result = await processAiQuestion(
      {
        userId: sessionUser.id,
        businessId: sessionUser.businessId,
        role: sessionUser.role as 'OWNER' | 'MANAGER' | 'STAFF',
        branchId,
        businessName: business.name,
        currency: business.currency,
      },
      question,
    )

    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    console.error('[AI Assistant API Error]', err)
    return NextResponse.json(
      {
        error: 'Failed to process AI question. Core business records remain fully operational.',
      },
      { status: 500 },
    )
  }
}

