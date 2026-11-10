import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { listExpenseEntries, createExpenseEntry, FinancialError } from '@/lib/financials'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createExpenseSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().trim().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff has no access to expenses per Permission Matrix
  if (session.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff accounts cannot access expense records.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const branchParam = searchParams.get('branch') || undefined
  const category = searchParams.get('category') || undefined
  const search = searchParams.get('search') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  try {
    const rlsRole = toRlsRole(session.role)
    const result = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        const scope = await getDashboardScope(tx, {
          userId: session.userId,
          businessId: session.businessId,
          role: session.role,
          branchParam,
        })

        return listExpenseEntries(tx, {
          businessId: session.businessId,
          branchIds: scope.branchIds,
          category,
          search,
          page,
          pageSize,
        })
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list expense entries:', error)
    return NextResponse.json({ error: 'Failed to retrieve expense records' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff has no access to expenses per Permission Matrix
  if (session.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff accounts cannot record expenses.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const parsedDate = new Date(parsed.data.date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const rlsRole = toRlsRole(session.role)
    const entry = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        branchId: parsed.data.branchId,
        userId: session.userId,
      },
      async (tx) => {
        const scope = await getDashboardScope(tx, {
          userId: session.userId,
          businessId: session.businessId,
          role: session.role,
        })

        if (!scope.branchIds.includes(parsed.data.branchId)) {
          throw new FinancialError('Not authorized to record expenses for this branch.', 403)
        }

        return createExpenseEntry(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            branchId: parsed.data.branchId,
            category: parsed.data.category,
            amount: parsed.data.amount,
            date: parsedDate,
            note: parsed.data.note,
          },
        )
      },
    )

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch (error) {
    if (error instanceof FinancialError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to create expense entry:', error)
    return NextResponse.json({ error: 'An unexpected error occurred while recording expense.' }, { status: 500 })
  }
}

