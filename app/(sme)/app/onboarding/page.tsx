import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { trackAnalyticsEventNow } from '@/lib/analytics'
import OnboardingSteps from './onboarding-steps'

export const metadata: Metadata = {
  title: 'Get started - Operafrika',
}

export default async function OnboardingPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/app/auth?view=login')
  }

  if (!user.emailVerifiedAt) {
    redirect('/app/auth/verify-email')
  }

  const { dbUser, business, alreadyStarted } = await withRls(
    {
      role: toRlsRole(user.role),
      businessId: user.businessId,
      userId: user.id,
    },
    async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { onboardingCompletedAt: true },
      })

      if (dbUser?.onboardingCompletedAt) {
        return { dbUser, business: null, alreadyStarted: null }
      }

      const business = await tx.business.findUnique({
        where: { id: user.businessId },
        include: {
          branches: {
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      const alreadyStarted = await tx.analyticsEvent.findFirst({
        where: {
          userId: user.id,
          eventType: 'onboarding_started',
        },
        select: { id: true },
      })

      return { dbUser, business, alreadyStarted }
    },
  )

  if (dbUser?.onboardingCompletedAt) {
    redirect('/app')
  }

  if (!alreadyStarted) {
    await trackAnalyticsEventNow({
      eventType: 'onboarding_started',
      userId: user.id,
      businessId: user.businessId,
    })
  }

  const firstBranch = business?.branches[0]

  return (
    <OnboardingSteps
      role={user.role}
      initialData={{
        businessName: business?.name ?? '',
        businessType: business?.businessType ?? 'Retail & Commerce',
        currency: business?.currency ?? 'NGN',
        contactInfo: business?.contactInfo ?? '',
        branchName: firstBranch?.name ?? 'Main Branch',
        branchAddress: firstBranch?.address ?? '',
        branchContactInfo: firstBranch?.contactInfo ?? '',
      }}
    />
  )
}
