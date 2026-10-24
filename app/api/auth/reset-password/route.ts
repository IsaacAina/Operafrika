import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { revokeAllSessions } from '@/lib/session'
import { hashToken } from '@/lib/token-hash'
import { resetPasswordSchema, firstIssue, readJson } from '@/lib/validation'
import { isBreachedPassword, BREACHED_PASSWORD_ERROR } from '@/lib/breached-password'
import { guard } from '@/lib/rate-limit'

export async function POST(req: Request) {
  return guard(req, 'reset-password', async () => {
    const parsed = resetPasswordSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }

    const { token, password } = parsed.data

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (await isBreachedPassword(password)) {
      return NextResponse.json({ error: BREACHED_PASSWORD_ERROR }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    // The password change, the revocation of every existing session, and the
    // consumption of the reset token all succeed or fail together. A reset
    // must evict a session that was opened with the old password.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      })

      await revokeAllSessions(resetToken.userId, tx)

      await tx.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
    })

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  })
}
