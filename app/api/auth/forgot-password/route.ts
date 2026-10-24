import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { hashToken } from '@/lib/token-hash'
import { forgotPasswordSchema, firstIssue, readJson } from '@/lib/validation'
import { guard } from '@/lib/rate-limit'

export async function POST(req: Request) {
  return guard(
    req,
    'forgot-password',
    async () => {
      const parsed = forgotPasswordSchema.safeParse(await readJson(req))
      if (!parsed.success) {
        return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
      }

      const { email } = parsed.data

      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        const token = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 60 * 60 * 1000)

        // Only the hash is stored. The raw token exists in the email link and
        // nowhere else, so a leaked table cannot reset this account.
        await prisma.passwordResetToken.upsert({
          where: { userId: user.id },
          update: { tokenHash: hashToken(token), expires },
          create: { userId: user.id, tokenHash: hashToken(token), expires },
        })

        const appUrl = process.env.APP_URL || 'http://localhost:3000'
        const resetUrl = `${appUrl}/app/auth/reset-password/${token}`

        await sendEmail({
          to: email,
          subject: 'Reset your Operafrika password',
          text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
          html: `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link.',
      })
    },
    { countAllAttempts: true },
  )
}
