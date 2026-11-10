import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import {
  listRecentStockMovements,
  recordStockMovement,
  StockError,
} from '@/lib/stock'
import { StockMovementType } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const recordMovementSchema = z.object({
  stockItemId: z.string().min(1, 'Stock item is required'),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  reason: z.string().trim().min(1, 'Reason is required'),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchParam = searchParams.get('branch') || undefined

  try {
    const rlsRole = toRlsRole(session.role)
    const movements = await withRls(
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

        return listRecentStockMovements(tx, scope.branchIds)
      },
    )

    return NextResponse.json({ movements })
  } catch (error) {
    console.error('Failed to list stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve stock movements' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff accounts cannot adjust stock or record movements.' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = recordMovementSchema.safeParse(body)
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
        userId: session.userId,
      },
      async (tx) => {
        return recordStockMovement(
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

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to record stock movement:', error)
    return NextResponse.json(
      { error: 'Could not record stock movement' },
      { status: 500 },
    )
  }
}

