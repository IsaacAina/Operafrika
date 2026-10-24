import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/welcome-email'
import { signupSchema, firstIssue, readJson } from '@/lib/validation'
import { isBreachedPassword, BREACHED_PASSWORD_ERROR } from '@/lib/breached-password'
import { issueVerificationCode, sendVerificationEmail } from '@/lib/email-verification'
import { isUniqueConstraintViolation } from '@/lib/prisma-errors'
import { guard } from '@/lib/rate-limit'
import { Role } from '@/generated/prisma/client'
import { trackAnalyticsEvent } from '@/lib/analytics'

export async function POST(req: Request) {
  return guard(req, 'signup', async () => {
    const parsed = signupSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }

    const { name: fullName, email, password } = parsed.data

    if (await isBreachedPassword(password)) {
      return NextResponse.json({ error: BREACHED_PASSWORD_ERROR }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    // The business, branch, user and subscription are created together. If the
    // email is already registered the unique constraint rejects the write and
    // the whole transaction rolls back, so a business is never left without
    // an owner.
    let user
    try {
      user = await prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: {
            name: fullName + "'s Business",
            businessType: 'General',
            currency: 'NGN',
          },
        })

        const branch = await tx.branch.create({
          data: {
            businessId: business.id,
            name: 'Main Branch',
          },
        })

        const created = await tx.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            role: Role.OWNER,
            businessId: business.id,
          },
        })

        await tx.subscription.create({
          data: {
            businessId: business.id,
            planName: 'Free (Test Period)',
            price: 0,
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })

        await trackAnalyticsEvent(tx, {
          eventType: 'user_signed_up',
          userId: created.id,
          businessId: business.id,
        })

        await trackAnalyticsEvent(tx, {
          eventType: 'business_created',
          userId: created.id,
          businessId: business.id,
        })

        await trackAnalyticsEvent(tx, {
          eventType: 'branch_created',
          userId: created.id,
          businessId: business.id,
          branchId: branch.id,
        })

        return created
      })
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 })
      }
      throw error
    }

    await createSession({
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
      email: user.email,
      emailVerified: false,
    })

    sendWelcomeEmail(email, fullName).catch((err) => {
      console.error('Failed to send welcome email:', err)
    })

    const verificationCode = await issueVerificationCode(user.id)
    sendVerificationEmail(email, verificationCode).catch((err) => {
      console.error('Failed to send verification email:', err)
    })

    return NextResponse.json({ success: true, redirect: '/app/onboarding' })
  })
}
