import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { createInvoice, listInvoices, SalesError } from '@/lib/sales'
import { InvoiceStatus } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createInvoiceSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  customerId: z.string().trim().optional().nullable(),
  items: z
    .array(
      z.object({
        stockItemId: z.string().min(1, 'Stock item is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        price: z.number().min(0, 'Price cannot be negative'),
      }),
    )
    .min(1, 'At least one line item is required'),
  status: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
  paymentMethod: z.string().trim().optional().nullable(),
  paymentAmount: z.number().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchParam = searchParams.get('branch') || undefined
  const search = searchParams.get('search') || undefined
  const statusParam = searchParams.get('status')
  const status =
    statusParam === 'PAID' || statusParam === 'UNPAID' || statusParam === 'PARTIAL'
      ? (statusParam as InvoiceStatus)
      : undefined
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

        return listInvoices(tx, {
          businessId: session.businessId,
          branchIds: scope.branchIds,
          search,
          status,
          page,
          pageSize,
        })
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list invoices:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve invoices' },
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

  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const invoice = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        branchId: parsed.data.branchId,
        userId: session.userId,
      },
      async (tx) => {
        // Enforce branch scope from database session
        const scope = await getDashboardScope(tx, {
          userId: session.userId,
          businessId: session.businessId,
          role: session.role,
        })

        if (!scope.branchIds.includes(parsed.data.branchId)) {
          throw new SalesError('Not authorized to create sales in this branch.', 403)
        }

        return createInvoice(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            branchId: parsed.data.branchId,
            customerId: parsed.data.customerId,
            items: parsed.data.items,
            status: parsed.data.status,
            paymentMethod: parsed.data.paymentMethod,
            paymentAmount: parsed.data.paymentAmount,
          },
        )
      },
    )

    return NextResponse.json({ success: true, invoice }, { status: 201 })
  } catch (error) {
    if (error instanceof SalesError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to create invoice:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the invoice.' },
      { status: 500 },
    )
  }
}

