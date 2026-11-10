import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { updateStockItem, StockError } from '@/lib/stock'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateStockSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').optional(),
  sku: z.string().trim().optional().nullable(),
  costPrice: z.number().min(0, 'Cost price must be positive').optional(),
  sellingPrice: z.number().min(0, 'Selling price must be positive').optional(),
  reorderThreshold: z.number().int().min(0, 'Reorder threshold must be 0 or more').optional(),
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
      { error: 'Staff accounts have read-only access to stock.' },
      { status: 403 },
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateStockSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const item = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return updateStockItem(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
          },
          id,
          parsed.data,
        )
      },
    )

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to update stock item:', error)
    return NextResponse.json(
      { error: 'Could not update stock item' },
      { status: 500 },
    )
  }
}

