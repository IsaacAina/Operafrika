import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { issueVerificationCode, sendVerificationEmail } from '@/lib/email-verification'
import { guard } from '@/lib/rate-limit'

export async function POST(req: Request) {
  return guard(
    req,
    'resend-verification',
    async () => {
      const session = await getSession()
      if (!session) {
        return NextResponse.json(
          { error: 'You must be signed in to request a verification code.' },
          { status: 401 },
        )
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true, emailVerifiedAt: true },
      })

      if (!user) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
      }

      if (user.emailVerifiedAt) {
        return NextResponse.json({
          success: true,
          message: 'Your email address is already verified.',
        })
      }

      const code = await issueVerificationCode(session.userId)
      sendVerificationEmail(user.email, code).catch((err) => {
        console.error('Failed to send verification email:', err)
      })

      return NextResponse.json({
        success: true,
        message: 'A new verification code has been sent to your email.',
      })
    },
    { countAllAttempts: true },
  )
}
