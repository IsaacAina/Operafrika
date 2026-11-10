import { NextResponse } from 'next/server'
import { getPlatformSession } from '@/lib/platform-auth'
import { withSystemRls } from '@/lib/rls'
import { writeAuditEntry } from '@/lib/audit-log'
import { AuditAction } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ALLOWED_CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR', 'EUR', 'GBP']

export async function POST(request: Request) {
  try {
    const session = await getPlatformSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized platform access' }, { status: 401 })
    }

    if (!session.canAccessAdminConsole) {
      return NextResponse.json({ error: 'Forbidden: Admin Console capability required' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, currency } = body

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid businessId' }, { status: 400 })
    }

    if (!currency || typeof currency !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid currency' }, { status: 400 })
    }

    const normalizedCurrency = currency.trim().toUpperCase()
    if (!ALLOWED_CURRENCIES.includes(normalizedCurrency)) {
      return NextResponse.json(
        { error: `Invalid currency code. Allowed: ${ALLOWED_CURRENCIES.join(', ')}` },
        { status: 400 },
      )
    }

    const result = await withSystemRls(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, currency: true, deletedAt: true },
      })

      if (!business || business.deletedAt) {
        throw new Error('Business not found or has been deleted')
      }

      const previousCurrency = business.currency

      // Update business currency
      const updated = await tx.business.update({
        where: { id: business.id },
        data: { currency: normalizedCurrency },
        select: { id: true, name: true, currency: true },
      })

      // Write inline audit log (rule: must succeed or transaction rolls back)
      await writeAuditEntry(tx, {
        userId: null,
        actorEmail: session.email,
        businessId: business.id,
        action: AuditAction.CURRENCY_CORRECTED,
        resourceType: 'Business',
        resourceId: business.id,
        previousValue: { currency: previousCurrency },
        newValue: { currency: normalizedCurrency },
        metadata: {
          platformUserId: session.platformUserId,
          reason: 'Platform Admin Correction',
        },
      })

      return {
        businessId: updated.id,
        name: updated.name,
        previousCurrency,
        currency: updated.currency,
      }
    })

    return NextResponse.json({
      success: true,
      message: `Currency for "${result.name}" successfully corrected from ${result.previousCurrency} to ${result.currency}.`,
      data: result,
    })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json({ error: err.message || 'Failed to correct currency' }, { status: 500 })
  }
}

