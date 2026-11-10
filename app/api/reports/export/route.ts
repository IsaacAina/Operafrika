import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { toRlsRole, withRls } from '@/lib/rls'
import {
  getProfitLossStatement,
  getStaffSalesStatement,
  generateCsv,
  type ReportActor,
} from '@/lib/reports'
import { getDashboardScope } from '@/lib/dashboard'

export async function GET(req: NextRequest) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('report') || 'pl'
  const branchParam = searchParams.get('branch') || undefined
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  // Date parsing with sensible defaults (Current Month)
  const now = new Date()
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = toParam ? new Date(toParam) : new Date(now.getFullYear(), now.getMonth() + 1, 1)

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 })
  }

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

        const actor: ReportActor = {
          userId: user.userId,
          role: user.role,
          businessId: user.businessId,
          email: user.email,
        }

        // Branch and Role Permission Enforcement
        if (user.role === 'STAFF') {
          // Staff is strictly limited to their own branch's sales report
          const branchId = scope.selectedBranch?.id || scope.branches[0]?.id
          if (!branchId) {
            throw new Error('No branch assigned to staff member.')
          }

          const statement = await getStaffSalesStatement(tx, actor, {
            branchId,
            branchName: scope.selectedBranch?.name || 'Assigned Branch',
            from,
            to,
          })

          const headers = [
            'Invoice ID',
            'Date',
            'Customer',
            'Status',
            'Total Amount',
            'Payment Amount',
            'Payment Method',
          ]

          const rows = statement.invoices.map((inv) => [
            inv.id,
            new Date(inv.date).toISOString().split('T')[0],
            inv.customerName,
            inv.status,
            inv.total.toFixed(2),
            inv.paymentAmount.toFixed(2),
            inv.paymentMethod || 'None',
          ])

          // Append summary row
          rows.push([])
          rows.push(['SUMMARY', '', '', '', '', '', ''])
          rows.push(['Total Invoiced', statement.totalInvoiced.toFixed(2), '', '', '', '', ''])
          rows.push(['Total Collected', statement.totalCollected.toFixed(2), '', '', '', '', ''])
          rows.push(['Total Pending', statement.totalPending.toFixed(2), '', '', '', '', ''])

          return {
            filename: `operafrika-sales-${branchId.slice(0, 8)}-${from.toISOString().split('T')[0]}.csv`,
            content: generateCsv(headers, rows),
          }
        }

        // For Owner and Manager: P&L Report Export
        const branchIds = scope.isCombined
          ? scope.branches.map((b) => b.id)
          : scope.selectedBranch
          ? [scope.selectedBranch.id]
          : scope.branches.map((b) => b.id)

        const branchName = scope.isCombined
          ? 'All Branches'
          : scope.selectedBranch?.name || 'Branch'

        const statement = await getProfitLossStatement(tx, actor, {
          branchIds,
          branchName,
          from,
          to,
        })

        const headers = [
          'Date',
          'Type',
          'Branch',
          'Description',
          'Credit (Revenue)',
          'Debit (Expense)',
        ]

        const rows = statement.recentEntries.map((e) => [
          new Date(e.date).toISOString().split('T')[0],
          e.type,
          e.branchName,
          e.description,
          e.isCredit ? e.amount.toFixed(2) : '',
          !e.isCredit ? e.amount.toFixed(2) : '',
        ])

        // Append P&L Financial Statement Summary Section
        rows.push([])
        rows.push(['PROFIT & LOSS SUMMARY', '', '', '', '', ''])
        rows.push(['Period', `${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}`, '', '', '', ''])
        rows.push(['Branch Scope', branchName, '', '', '', ''])
        rows.push(['Invoice Payments Collected', statement.totals.invoicePayments.toFixed(2), '', '', '', ''])
        rows.push(['Direct Income Recorded', statement.totals.income.toFixed(2), '', '', '', ''])
        rows.push(['TOTAL REVENUE', statement.totals.revenue.toFixed(2), '', '', '', ''])
        rows.push(['Operating Expenses', statement.totals.expenses.toFixed(2), '', '', '', ''])
        rows.push(['Salaries & Payroll', statement.totals.payroll.toFixed(2), '', '', '', ''])
        rows.push(['TOTAL EXPENSES', statement.totals.totalExpenses.toFixed(2), '', '', '', ''])
        rows.push(['NET PROFIT / (LOSS)', statement.totals.netProfit.toFixed(2), '', '', '', ''])

        return {
          filename: `operafrika-pl-statement-${branchName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${from.toISOString().split('T')[0]}.csv`,
          content: generateCsv(headers, rows),
        }
      }
    )

    return new Response(csvData.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvData.filename}"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to export report' },
      { status: err.status || 500 }
    )
  }
}

