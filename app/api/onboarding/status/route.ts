import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ completed: false }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { onboardingCompletedAt: true },
  })

  return Response.json({ completed: Boolean(user?.onboardingCompletedAt) })
}
