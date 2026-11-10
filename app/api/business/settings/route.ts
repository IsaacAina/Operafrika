import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { toRlsRole, withRls } from '@/lib/rls'
import {
  getBusinessSettings,
  updateBusinessProfile,
  SettingsError,
  type SettingsActor,
} from '@/lib/settings'

export async function GET() {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff accounts are not authorized to view business settings.' },
      { status: 403 }
    )
  }

  const rlsRole = toRlsRole(user.role)

  try {
    const settings = await withRls(
      {
        role: rlsRole,
        businessId: user.businessId,
        userId: user.userId,
      },
      async (tx) => {
        const actor: SettingsActor = {
          userId: user.userId,
          role: user.role,
          businessId: user.businessId,
          email: user.email,
        }
        return getBusinessSettings(tx, actor)
      }
    )

    return NextResponse.json({ settings })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch business settings' },
      { status: err.status || 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only Business Owners can update business profile settings.' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { name, businessType, contactInfo, currency } = body

    if (currency !== undefined) {
      return NextResponse.json(
        {
          error:
            'Currency is locked after onboarding and cannot be changed by the business. Only a Platform Admin can correct currency.',
        },
        { status: 400 }
      )
    }

    const rlsRole = toRlsRole(user.role)

    const settings = await withRls(
      {
        role: rlsRole,
        businessId: user.businessId,
        userId: user.userId,
      },
      async (tx) => {
        const actor: SettingsActor = {
          userId: user.userId,
          role: user.role,
          businessId: user.businessId,
          email: user.email,
        }
        return updateBusinessProfile(tx, actor, { name, businessType, contactInfo })
      }
    )

    return NextResponse.json({ settings })
  } catch (err: any) {
    if (err instanceof SettingsError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to update business profile' },
      { status: 500 }
    )
  }
}

