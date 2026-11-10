import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { recordInvoicePayment, SalesError } from '@/lib/sales'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const paymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.string().trim().min(1, 'Payment method is required'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff cannot update or record payments on invoices per Permission Matrix
  if (session.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff members are not permitted to record invoice payments.' },
      { status: 403 },
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = paymentSchema.safeParse(body)
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
        userId: session.userId,
      },
      async (tx) => {
        return recordInvoicePayment(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            invoiceId: id,
            amount: parsed.data.amount,
            paymentMethod: parsed.data.paymentMethod,
          },
        )
      },
    )

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    if (error instanceof SalesError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to record payment:', error)
    return NextResponse.json(
      { error: 'Failed to record invoice payment' },
      { status: 500 },
    )
  }
}

