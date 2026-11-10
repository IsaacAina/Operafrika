import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { createStockItem, listStockItems, StockError } from '@/lib/stock'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createStockSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  name: z.string().trim().min(1, 'Item name is required'),
  sku: z.string().trim().optional().nullable(),
  quantity: z.number().int().min(0, 'Quantity must be 0 or more').default(0),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  reorderThreshold: z.number().int().min(0, 'Reorder threshold must be 0 or more').default(5),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchParam = searchParams.get('branch') || undefined
  const search = searchParams.get('search') || undefined
  const lowStockOnly = searchParams.get('lowStock') === 'true'

  try {
    const rlsRole = toRlsRole(session.role)
    const items = await withRls(
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

        return listStockItems(tx, {
          businessId: session.businessId,
          branchIds: scope.branchIds,
          search,
          lowStockOnly,
        })
      },
    )

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to list stock items:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve stock items' },
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
      { error: 'Staff accounts have read-only access to stock.' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createStockSchema.safeParse(body)
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
        branchId: parsed.data.branchId,
        userId: session.userId,
      },
      async (tx) => {
        return createStockItem(
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

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to create stock item:', error)
    return NextResponse.json(
      { error: 'Could not create stock item' },
      { status: 500 },
    )
  }
}

