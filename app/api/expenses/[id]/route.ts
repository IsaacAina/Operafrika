import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { deleteExpenseEntry, FinancialError } from '@/lib/financials'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff accounts cannot delete expense records.' }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Expense entry ID is required' }, { status: 400 })
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
        return deleteExpenseEntry(
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
    if (error instanceof FinancialError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to delete expense entry:', error)
    return NextResponse.json({ error: 'Failed to delete expense record' }, { status: 500 })
  }
}

