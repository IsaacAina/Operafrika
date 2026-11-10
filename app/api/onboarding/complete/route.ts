import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { withSystemRls } from '@/lib/rls'
import { trackAnalyticsEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const user = await withSystemRls((tx) =>
    tx.user.findUnique({
      where: { id: session.userId },
      select: { onboardingCompletedAt: true },
    }),
  )

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (user.onboardingCompletedAt) {
    return NextResponse.json({ success: true, alreadyCompleted: true })
  }

  await withSystemRls(async (tx) => {
    await tx.user.update({
      where: { id: session.userId },
      data: { onboardingCompletedAt: new Date() },
    })

    await trackAnalyticsEvent(tx, {
      eventType: 'onboarding_completed',
      userId: session.userId,
      businessId: session.businessId,
    })
  })

  return NextResponse.json({ success: true })
}
