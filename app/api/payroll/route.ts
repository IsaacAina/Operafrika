import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { listPayrollRecords, createPayrollRecord, StaffError } from '@/lib/staff'
import { InvoiceStatus } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createPayrollSchema = z.object({
  userId: z.string().min(1, 'Staff member is required'),
  payPeriod: z.string().min(1, 'Pay period (e.g. 2026-11) is required'),
  salaryAmount: z.number().positive('Salary amount must be greater than zero'),
  status: z.enum(['PAID', 'UNPAID']).optional(),
  datePaid: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Payroll is strictly confidential to the Business Owner
  if (session.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Payroll records are strictly restricted to the Business Owner.' },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const payPeriod = searchParams.get('payPeriod') || undefined
  const branchId = searchParams.get('branch') || undefined
  const statusParam = searchParams.get('status')
  const status =
    statusParam === 'PAID' || statusParam === 'UNPAID'
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
        return listPayrollRecords(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            businessId: session.businessId,
            payPeriod,
            branchId,
            status,
            page,
            pageSize,
          },
        )
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof StaffError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to list payroll records:', error)
    return NextResponse.json({ error: 'Failed to retrieve payroll records.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Payroll records can only be created by the Business Owner.' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createPayrollSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const datePaid = parsed.data.datePaid ? new Date(parsed.data.datePaid) : null

    const record = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return createPayrollRecord(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            userId: parsed.data.userId,
            payPeriod: parsed.data.payPeriod,
            salaryAmount: parsed.data.salaryAmount,
            status: parsed.data.status as InvoiceStatus | undefined,
            datePaid,
          },
        )
      },
    )

    return NextResponse.json({ success: true, record }, { status: 201 })
  } catch (error) {
    if (error instanceof StaffError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to create payroll record:', error)
    return NextResponse.json({ error: 'An unexpected error occurred while creating payroll record.' }, { status: 500 })
  }
}

