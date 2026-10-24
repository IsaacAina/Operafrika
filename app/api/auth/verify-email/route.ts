import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { verifyEmailSchema, firstIssue, readJson } from '@/lib/validation'
import { verifyEmailCode } from '@/lib/email-verification'
import { guard } from '@/lib/rate-limit'

export async function POST(req: Request) {
  return guard(req, 'verify-email', async () => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to verify your email.' },
        { status: 401 },
      )
    }

    const parsed = verifyEmailSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }

    const result = await verifyEmailCode(session.userId, parsed.data.code)

    switch (result) {
      case 'verified':
        return NextResponse.json({
          success: true,
          message: 'Your email address has been verified.',
        })
      case 'already-verified':
        return NextResponse.json({
          success: true,
          message: 'Your email address is already verified.',
        })
      case 'expired':
        return NextResponse.json(
          { error: 'This code has expired. Request a new code.' },
          { status: 400 },
        )
      case 'too-many-attempts':
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Request a new code.' },
          { status: 429 },
        )
      default:
        return NextResponse.json(
          { error: 'Incorrect code. Please try again.' },
          { status: 400 },
        )
    }
  })
}
