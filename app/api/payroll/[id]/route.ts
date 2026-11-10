import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { updatePayrollStatus, StaffError } from '@/lib/staff'
import { InvoiceStatus } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updatePayrollSchema = z.object({
  status: z.enum(['PAID', 'UNPAID']),
  datePaid: z.string().optional().nullable(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only business owners can update payroll records.' },
      { status: 403 },
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Payroll record ID is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updatePayrollSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const datePaid = parsed.data.datePaid ? new Date(parsed.data.datePaid) : null

    const updated = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return updatePayrollStatus(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            payrollId: id,
            status: parsed.data.status as InvoiceStatus,
            datePaid,
          },
        )
      },
    )

    return NextResponse.json({ success: true, record: updated })
  } catch (error) {
    if (error instanceof StaffError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to update payroll record:', error)
    return NextResponse.json({ error: 'Failed to update payroll record.' }, { status: 500 })
  }
}

