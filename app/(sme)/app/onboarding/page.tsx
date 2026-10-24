import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { onboardingCompletedAt: true },
  })

  if (dbUser?.onboardingCompletedAt) {
    redirect('/app')
  }

  // Load current business and first branch
  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    include: {
      branches: {
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Track server-side onboarding_started event if this is the first visit
  const alreadyStarted = await prisma.analyticsEvent.findFirst({
    where: {
      userId: user.id,
      eventType: 'onboarding_started',
    },
    select: { id: true },
  })

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
