import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { toRlsRole, withRls } from '@/lib/rls'
import { hashPassword, verifyPassword } from '@/lib/password'
import { writeAuditEntry } from '@/lib/audit-log'
import { AuditAction } from '@prisma/client'

export async function POST(req: NextRequest) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    const rlsRole = toRlsRole(user.role)

    await withRls(
      {
        role: rlsRole,
        businessId: user.businessId,
        userId: user.userId,
      },
      async (tx) => {
        const dbUser = await tx.user.findUnique({
          where: { id: user.userId },
          select: { id: true, passwordHash: true },
        })

        if (!dbUser) {
          throw new Error('User record not found.')
        }

        const isMatch = await verifyPassword(currentPassword, dbUser.passwordHash)
        if (!isMatch) {
          throw new Error('Incorrect current password.')
        }

        const newHash = await hashPassword(newPassword)

        await tx.user.update({
          where: { id: user.userId },
          data: { passwordHash: newHash },
        })

        await writeAuditEntry(tx, {
          businessId: user.businessId,
          userId: user.userId,
          actorEmail: user.email,
          action: AuditAction.ROLE_PERMISSION_CHANGED,
          resourceType: 'UserCredentials',
          resourceId: user.userId,
          metadata: { action: 'password_updated' },
        })
      }
    )

    return NextResponse.json({ success: true, message: 'Password updated successfully.' })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update password' },
      { status: 400 }
    )
  }
}

