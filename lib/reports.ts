import { Prisma, InvoiceStatus, Role } from '@prisma/client'
import { calculateProfitLoss, type ProfitLossTotals } from '@/lib/profit-loss'

export interface ReportActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export interface DateRange {
  from: Date
  to: Date
}

export interface ExpenseCategoryBreakdown {
  category: string
  amount: number
  percentage: number
}

export interface StatementEntry {
  id: string
  date: Date
  type: 'INVOICE' | 'INCOME' | 'EXPENSE' | 'PAYROLL'
  branchName: string
  description: string
  amount: number
  isCredit: boolean
}

export interface ProfitLossStatement {
  period: {
    from: string
    to: string
    label: string
  }
  branchName: string
  totals: ProfitLossTotals
  categoryBreakdown: ExpenseCategoryBreakdown[]
  recentEntries: StatementEntry[]
}

export interface StaffSalesStatement {
  period: {
    from: string
    to: string
    label: string
  }
  branchName: string
  totalInvoiced: number
  totalCollected: number
  totalPending: number
  invoiceCount: number
  invoices: Array<{
    id: string
    date: Date
    customerName: string
    status: InvoiceStatus
    total: number
    paymentAmount: number
    paymentMethod: string | null
  }>
}

/**
 * Computes a detailed Profit & Loss Statement for a given branch scope and date range.
 * Owner can compute across all branches or a single branch.
 * Manager can only compute for their assigned branch.
 * Staff has NO access to P&L (must use getStaffSalesStatement).
 */
export async function getProfitLossStatement(
  tx: Prisma.TransactionClient,
  actor: ReportActor,
  options: {
    branchIds: string[]
    branchName: string
    from: Date
    to: Date
    label?: string
  },
): Promise<ProfitLossStatement> {
  if (actor.role === 'STAFF') {
    throw new Error('Staff accounts are not authorized to view Profit & Loss reports.')
  }

  const { branchIds, branchName, from, to, label = 'Custom Period' } = options

  // 1. Calculate Core P&L Totals via standard formula
  const totals = await calculateProfitLoss(tx, {
    businessId: actor.businessId,
    branchIds,
    combined: branchIds.length > 1,
    from,
    to,
  })

  // 2. Fetch Expense Category Breakdown
  const expensesGrouped = await tx.expenseEntry.groupBy({
    by: ['category'],
    where: {
      branchId: { in: branchIds },
      date: { gte: from, lt: to },
    },
    _sum: { amount: true },
  })

  const categoryBreakdown: ExpenseCategoryBreakdown[] = []
  const totalOpExpenses = totals.expenses

  for (const group of expensesGrouped) {
    const amt = Number(group._sum.amount ?? 0)
    categoryBreakdown.push({
      category: group.category,
      amount: amt,
      percentage: totalOpExpenses > 0 ? (amt / totalOpExpenses) * 100 : 0,
    })
  }

  // Include Payroll as an expense category if present and visible
  if (totals.payroll > 0) {
    categoryBreakdown.push({
      category: 'Salaries & Payroll',
      amount: totals.payroll,
      percentage: totals.totalExpenses > 0 ? (totals.payroll / totals.totalExpenses) * 100 : 0,
    })
  }

  categoryBreakdown.sort((a, b) => b.amount - a.amount)

  // 3. Fetch Recent Itemized Entries for the Statement
  const [invoices, incomes, expenses] = await Promise.all([
    tx.invoice.findMany({
      where: {
        branchId: { in: branchIds },
        status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] },
        createdAt: { gte: from, lt: to },
      },
      include: {
        branch: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    tx.incomeEntry.findMany({
      where: {
        branchId: { in: branchIds },
        date: { gte: from, lt: to },
      },
      include: {
        branch: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 25,
    }),
    tx.expenseEntry.findMany({
      where: {
        branchId: { in: branchIds },
        date: { gte: from, lt: to },
      },
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 25,
    }),
  ])

  const recentEntries: StatementEntry[] = []

  for (const inv of invoices) {
    const amt = Number(inv.paymentAmount ?? inv.total)
    recentEntries.push({
      id: inv.id,
      date: inv.createdAt,
      type: 'INVOICE',
      branchName: inv.branch.name,
      description: `Invoice to ${inv.customer?.name ?? 'Walk-in Customer'} (${inv.status})`,
      amount: amt,
      isCredit: true,
    })
  }

  for (const inc of incomes) {
    recentEntries.push({
      id: inc.id,
      date: inc.date,
      type: 'INCOME',
      branchName: inc.branch.name,
      description: inc.note || `Direct Income${inc.customer ? ` from ${inc.customer.name}` : ''}`,
      amount: Number(inc.amount),
      isCredit: true,
    })
  }

  for (const exp of expenses) {
    recentEntries.push({
      id: exp.id,
      date: exp.date,
      type: 'EXPENSE',
      branchName: exp.branch.name,
      description: exp.note ? `${exp.category}: ${exp.note}` : `${exp.category} expense`,
      amount: Number(exp.amount),
      isCredit: false,
    })
  }

  // Sort combined entries chronologically descending
  recentEntries.sort((a, b) => b.date.getTime() - a.date.getTime())

  return {
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      label,
    },
    branchName,
    totals,
    categoryBreakdown,
    recentEntries: recentEntries.slice(0, 30),
  }
}

/**
 * Computes Sales & Invoicing Report for Staff members within their assigned branch.
 */
export async function getStaffSalesStatement(
  tx: Prisma.TransactionClient,
  actor: ReportActor,
  options: {
    branchId: string
    branchName: string
    from: Date
    to: Date
    label?: string
  },
): Promise<StaffSalesStatement> {
  const { branchId, branchName, from, to, label = 'Custom Period' } = options

  const invoices = await tx.invoice.findMany({
    where: {
      branchId,
      createdAt: { gte: from, lt: to },
    },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  let totalInvoiced = 0
  let totalCollected = 0

  const items = invoices.map((inv) => {
    const tot = Number(inv.total)
    const paid = Number(inv.paymentAmount ?? (inv.status === InvoiceStatus.PAID ? inv.total : 0))
    totalInvoiced += tot
    totalCollected += paid

    return {
      id: inv.id,
      date: inv.createdAt,
      customerName: inv.customer?.name ?? 'Walk-in Customer',
      status: inv.status,
      total: tot,
      paymentAmount: paid,
      paymentMethod: inv.paymentMethod,
    }
  })

  return {
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      label,
    },
    branchName,
    totalInvoiced,
    totalCollected,
    totalPending: Math.max(0, totalInvoiced - totalCollected),
    invoiceCount: items.length,
    invoices: items,
  }
}

/**
 * Generates RFC 4180 compliant CSV strings.
 */
export function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const dataLines = rows.map((r) => r.map(escapeCell).join(','))
  return [headerLine, ...dataLines].join('\r\n')
}

