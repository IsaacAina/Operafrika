import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ completed: false }, { status: 401 })
  }

  const user = await withRls(
    {
      role: toRlsRole(session.role),
      businessId: session.businessId,
      userId: session.userId,
    },
    (tx) =>
      tx.user.findUnique({
        where: { id: session.userId },
        select: { onboardingCompletedAt: true },
      }),
  )

  return Response.json({ completed: Boolean(user?.onboardingCompletedAt) })
}
