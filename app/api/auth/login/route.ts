import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'
import { loginSchema, firstIssue, readJson } from '@/lib/validation'
import { resolveSafeRedirect } from '@/lib/session'
import { guard } from '@/lib/rate-limit'
import { createPlatformSession } from '@/lib/platform-auth'

/**
 * An argon2 hash of a random value that is not stored anywhere. Verifying
 * against it costs the same as verifying a real password, which keeps the
 * response time for an unknown email the same as for a wrong password.
 */
const UNKNOWN_ACCOUNT_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$alPlcjNnkMwPdJAgkOFySw$oTxReSyBDZmbki2sKnkg6ouz4ApjnUCOQmFJVLJ5kzw'

const UNKNOWN_PLATFORM_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$alPlcjNnkMwPdJAgkOFySw$oTxReSyBDZmbki2sKnkg6ouz4ApjnUCOQmFJVLJ5kzw'

export async function POST(req: Request) {
  return guard(
    req,
    'login',
    async () => {
      const parsed = loginSchema.safeParse(await readJson(req))
      if (!parsed.success) {
        return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
      }

      const { email, password, next } = parsed.data

      const platformUser = await prisma.platformUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          canAccessAdminConsole: true,
          canAccessFounderDashboard: true,
        },
      })

      if (platformUser) {
        const isPlatformValid = await verifyPassword(
          password,
          platformUser.passwordHash ?? UNKNOWN_PLATFORM_PASSWORD_HASH,
        )
        if (!isPlatformValid) {
          return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        await createPlatformSession({ id: platformUser.id })

        if (platformUser.canAccessAdminConsole && platformUser.canAccessFounderDashboard) {
          return NextResponse.json({ success: true, redirect: '/admin' })
        }
        if (platformUser.canAccessAdminConsole) {
          return NextResponse.json({ success: true, redirect: '/admin' })
        }
        if (platformUser.canAccessFounderDashboard) {
          return NextResponse.json({ success: true, redirect: '/founder' })
        }
        return NextResponse.json({ error: 'No platform access granted' }, { status: 403 })
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          businessId: true,
          role: true,
          email: true,
          passwordHash: true,
          emailVerifiedAt: true,
          bannedAt: true,
          lockedUntil: true,
          deletedAt: true,
          onboardingCompletedAt: true,
        },
      })

      // An unknown email is verified against a hash nobody knows, so the reply
      // takes the same time as a wrong password. Otherwise the response time
      // alone tells an attacker which emails are registered.
      const isValid = await verifyPassword(
        password,
        user?.passwordHash ?? UNKNOWN_ACCOUNT_PASSWORD_HASH,
      )

      if (!user || !isValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      if (user.bannedAt) {
        return NextResponse.json(
          { error: 'This account has been suspended. Contact support.' },
          { status: 403 },
        )
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return NextResponse.json(
          { error: 'This account is temporarily locked. Try again later.' },
          { status: 403 },
        )
      }

      // An account inside its deletion grace period is closed. It can only be
      // brought back through the cancellation link in the email.
      if (user.deletedAt) {
        return NextResponse.json(
          {
            error:
              'This account is scheduled for deletion. Use the link in your deletion email to keep it.',
          },
          { status: 403 },
        )
      }

      // Checked on every login request, not just at signup.
      const emailVerified = user.emailVerifiedAt !== null

      await createSession({
        userId: user.id,
        businessId: user.businessId,
        role: user.role,
        email: user.email,
        emailVerified,
      })

      const target = resolveSafeRedirect(next)

      if (!emailVerified) {
        return NextResponse.json({
          success: true,
          emailVerified,
          redirect: '/app/auth/verify-email',
        })
      }

      if (!user.onboardingCompletedAt) {
        return NextResponse.json({
          success: true,
          emailVerified,
          redirect: '/app/onboarding',
        })
      }

      return NextResponse.json({
        success: true,
        emailVerified,
        redirect: target ?? '/app',
      })
    },
    { bucketByEmail: true },
  )
}
