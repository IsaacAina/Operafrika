import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { exportCustomers } from '@/lib/customers'
import { generateCsv } from '@/lib/reports'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const branchParam = searchParams.get('branch') || undefined
  const search = searchParams.get('search') || undefined

  const rlsRole = toRlsRole(user.role)

  try {
    const csvData = await withRls(
      {
        role: rlsRole,
        businessId: user.businessId,
        userId: user.userId,
      },
      async (tx) => {
        const scope = await getDashboardScope(tx, {
          userId: user.userId,
          businessId: user.businessId,
          role: user.role,
          branchParam,
        })

        const customers = await exportCustomers(tx, {
          branchIds: scope.branchIds,
          search,
        })

        const headers = [
          'Customer Name',
          'Contact (Phone / Email)',
          'Assigned Branch',
          'Invoices Issued',
          'Total Spent',
          'Outstanding Balance',
          'Date Registered',
        ]

        const rows = customers.map((c) => [
          c.name,
          c.contact || 'N/A',
          c.branchName,
          c.invoiceCount,
          c.totalSpent.toFixed(2),
          c.outstandingBalance.toFixed(2),
          new Date(c.createdAt).toISOString().split('T')[0],
        ])

        const branchScopeLabel = scope.selectedBranch
          ? scope.selectedBranch.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
          : 'all-branches'
        const todayStr = new Date().toISOString().split('T')[0]

        return {
          filename: `operafrika-customers-${branchScopeLabel}-${todayStr}.csv`,
          content: generateCsv(headers, rows),
        }
      },
    )

    return new Response(csvData.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvData.filename}"`,
      },
    })
  } catch (err: any) {
    console.error('Failed to export customers:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to export customers' },
      { status: err.status || 500 },
    )
  }
}

