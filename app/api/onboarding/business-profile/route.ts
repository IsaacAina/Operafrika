import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { businessSetupSchema, firstIssue, readJson } from '@/lib/validation'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { Role } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Only the Owner can configure the business profile and branch details
  if (session.role !== Role.OWNER) {
    return NextResponse.json(
      { error: 'Only the business owner can configure business settings.' },
      { status: 403 },
    )
  }

  const parsed = businessSetupSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const {
    businessName,
    businessType,
    currency,
    contactInfo,
    branchName,
    branchAddress,
    branchContactInfo,
  } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update the business profile
      await tx.business.update({
        where: { id: session.businessId },
        data: {
          name: businessName,
          businessType,
          currency: currency || 'NGN',
          contactInfo: contactInfo || null,
        },
      })

      // 2. Find and update the initial branch
      const branch = await tx.branch.findFirst({
        where: { businessId: session.businessId },
        orderBy: { createdAt: 'asc' },
      })

      if (branch) {
        await tx.branch.update({
          where: { id: branch.id },
          data: {
            name: branchName,
            address: branchAddress || null,
            contactInfo: branchContactInfo || null,
          },
        })
      }

      // 3. Track analytics events
      await trackAnalyticsEvent(tx, {
        eventType: 'business_profile_updated',
        userId: session.userId,
        businessId: session.businessId,
        branchId: branch?.id ?? null,
      })

      await trackAnalyticsEvent(tx, {
        eventType: 'branch_updated',
        userId: session.userId,
        businessId: session.businessId,
        branchId: branch?.id ?? null,
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update business profile during onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to save business settings. Please try again.' },
      { status: 500 },
    )
  }
}
