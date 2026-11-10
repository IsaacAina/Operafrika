import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { importCustomers } from '@/lib/customers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importCsvSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  records: z.array(
    z.object({
      name: z.string().trim().min(1, 'Name is required'),
      contact: z.string().trim().optional().nullable(),
    }),
  ).min(1, 'At least one customer record is required to import'),
})

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

  const parsed = importCsvSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const result = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        branchId: parsed.data.branchId,
        userId: session.userId,
      },
      async (tx) => {
        return importCustomers(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          parsed.data.branchId,
          parsed.data.records,
        )
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to import customers:', error)
    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 },
    )
  }
}

