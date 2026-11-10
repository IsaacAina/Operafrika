import { InvoiceStatus, Prisma } from '@prisma/client'

export interface ProfitLossTotals {
  income: number
  invoicePayments: number
  revenue: number
  expenses: number
  payroll: number
  totalExpenses: number
  netProfit: number
}

export interface CalculateProfitLossInput {
  businessId: string
  branchIds: string[]
  combined: boolean
  from: Date
  to: Date
}

const EMPTY_TOTALS: ProfitLossTotals = {
  income: 0,
  invoicePayments: 0,
  revenue: 0,
  expenses: 0,
  payroll: 0,
  totalExpenses: 0,
  netProfit: 0,
}

/**
 * Profit and loss for a branch scope and period.
 *
 * Revenue is paid and partial invoice payments plus income entries. Expenses
 * are expense entries plus payroll records. This is the single calculation
 * used by the dashboard, reports, and the AI assistant once those ship.
 */
export async function calculateProfitLoss(
  tx: Prisma.TransactionClient,
  input: CalculateProfitLossInput,
): Promise<ProfitLossTotals> {
  const { branchIds, from, to } = input

  if (branchIds.length === 0) return EMPTY_TOTALS

  const [incomeTotal, expenseTotal, invoices, payrollRows] = await Promise.all([
    tx.incomeEntry.aggregate({
      where: {
        branchId: { in: branchIds },
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    }),
    tx.expenseEntry.aggregate({
      where: {
        branchId: { in: branchIds },
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    }),
    tx.invoice.findMany({
      where: {
        branchId: { in: branchIds },
        status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] },
        OR: [
          { paymentDate: { gte: from, lt: to } },
          { paymentDate: null, createdAt: { gte: from, lt: to } },
        ],
      },
      select: {
        status: true,
        total: true,
        paymentAmount: true,
      },
    }),
    tx.$queryRaw<Array<{ total: Prisma.Decimal | number | string | null }>>`
      SELECT payroll_total_for_scope(
        ARRAY[${Prisma.join(branchIds)}]::text[],
        ${from},
        ${to}
      ) AS total
    `,
  ])

  const income = Number(incomeTotal._sum.amount ?? 0)
  const expenses = Number(expenseTotal._sum.amount ?? 0)
  const payroll = Number(payrollRows[0]?.total ?? 0)

  const invoicePayments = invoices.reduce((total, invoice) => {
    if (invoice.status === InvoiceStatus.PAID) {
      return total + Number(invoice.paymentAmount ?? invoice.total)
    }
    if (invoice.status === InvoiceStatus.PARTIAL) {
      return total + Number(invoice.paymentAmount ?? 0)
    }
    return total
  }, 0)

  const revenue = income + invoicePayments
  const totalExpenses = expenses + payroll

  return {
    income,
    invoicePayments,
    revenue,
    expenses,
    payroll,
    totalExpenses,
    netProfit: revenue - totalExpenses,
  }
}
