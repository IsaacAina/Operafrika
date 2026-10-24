import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createPlatformSession } from '@/lib/platform-auth'
import { loginSchema, firstIssue, readJson } from '@/lib/validation'
import { guard } from '@/lib/rate-limit'

const UNKNOWN_ACCOUNT_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$alPlcjNnkMwPdJAgkOFySw$oTxReSyBDZmbki2sKnkg6ouz4ApjnUCOQmFJVLJ5kzw'

export async function POST(req: Request) {
  return guard(
    req,
    'platform-login',
    async () => {
      const parsed = loginSchema.safeParse(await readJson(req))
      if (!parsed.success) {
        return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
      }

      const { email, password } = parsed.data

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

      const isValid = await verifyPassword(
        password,
        platformUser?.passwordHash ?? UNKNOWN_ACCOUNT_PASSWORD_HASH,
      )

      if (!platformUser || !isValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      await createPlatformSession({ id: platformUser.id })

      // Prefer admin if both available, else choose based on capability
      let redirect = '/admin'
      if (platformUser.canAccessAdminConsole && platformUser.canAccessFounderDashboard) {
        redirect = '/admin'
      } else if (platformUser.canAccessFounderDashboard && !platformUser.canAccessAdminConsole) {
        redirect = '/founder'
      } else if (platformUser.canAccessAdminConsole) {
        redirect = '/admin'
      } else {
        return NextResponse.json({ error: 'No platform access granted' }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        redirect,
      })
    },
    { bucketByEmail: true },
  )
}
