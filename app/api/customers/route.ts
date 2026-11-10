import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { createCustomer, listCustomers, CustomerError } from '@/lib/customers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createCustomerSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  name: z.string().trim().min(1, 'Customer name is required'),
  contact: z.string().trim().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchParam = searchParams.get('branch') || undefined
  const search = searchParams.get('search') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '15', 10)

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

        return listCustomers(tx, {
          businessId: session.businessId,
          branchIds: scope.branchIds,
          search,
          page,
          pageSize,
        })
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list customers:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve customers' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const customer = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        branchId: parsed.data.branchId,
        userId: session.userId,
      },
      async (tx) => {
        return createCustomer(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          parsed.data,
        )
      },
    )

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    if (error instanceof CustomerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to create customer:', error)
    return NextResponse.json(
      { error: 'Could not create customer profile' },
      { status: 500 },
    )
  }
}

