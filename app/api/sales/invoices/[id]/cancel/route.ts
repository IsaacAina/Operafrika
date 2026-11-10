import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { cancelInvoice, SalesError } from '@/lib/sales'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff cannot cancel invoices per Permission Matrix
  if (session.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff members are not permitted to cancel invoices.' },
      { status: 403 },
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const result = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return cancelInvoice(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          id,
        )
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SalesError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to cancel invoice:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invoice' },
      { status: 500 },
    )
  }
}

