import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { updateCustomer, deleteCustomer, CustomerError } from '@/lib/customers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required').optional(),
  contact: z.string().trim().optional().nullable(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff accounts do not have permission to edit customer profiles.' },
      { status: 403 },
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateCustomerSchema.safeParse(body)
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
        userId: session.userId,
      },
      async (tx) => {
        return updateCustomer(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          id,
          parsed.data,
        )
      },
    )

    return NextResponse.json({ customer })
  } catch (error) {
    if (error instanceof CustomerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to update customer:', error)
    return NextResponse.json(
      { error: 'Could not update customer profile' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff accounts do not have permission to delete customer profiles.' },
      { status: 403 },
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
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
        return deleteCustomer(
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
    if (error instanceof CustomerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to delete customer:', error)
    return NextResponse.json(
      { error: 'Could not delete customer profile' },
      { status: 500 },
    )
  }
}


