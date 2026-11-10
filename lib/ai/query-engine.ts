import { InvoiceStatus } from '@prisma/client'
import { withRls, toRlsRole } from '@/lib/rls'
import { calculateProfitLoss } from '@/lib/profit-loss'
import { getDashboardScope } from '@/lib/dashboard'
import { generateAiExplanation } from './gemini-client'

export interface AiActorContext {
  userId: string
  businessId: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  branchId?: string
  businessName: string
  currency: string
}

export type AiAnswerLabel = 'Calculated Fact' | 'Estimate' | 'Insufficient Data'

export interface AiQueryResult {
  answer: string
  label: AiAnswerLabel
  dataSnapshot?: {
    metric: string
    value: string
    period?: string
    branchName?: string
    items?: Array<{ label: string; value: string }>
  }
  suggestedQuestions: string[]
}

function formatNaira(value: number, currency = 'NGN'): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString()}`
  }
}

function parseTimeframe(text: string): { from: Date; to: Date; label: string } {
  const q = text.toLowerCase()
  const now = new Date()

  if (q.includes('today')) {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 1)
    return { from, to, label: 'Today' }
  }

  if (q.includes('week') || q.includes('this week')) {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    const day = from.getDay()
    const offset = (day + 6) % 7
    from.setDate(from.getDate() - offset)
    const to = new Date(from)
    to.setDate(to.getDate() + 7)
    return { from, to, label: 'This Week' }
  }

  if (q.includes('year') || q.includes('this year')) {
    const from = new Date(now.getFullYear(), 0, 1)
    const to = new Date(now.getFullYear() + 1, 0, 1)
    return { from, to, label: 'This Year' }
  }

  // Default to This Month
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { from, to, label: 'This Month' }
}

export async function processAiQuestion(
  actor: AiActorContext,
  question: string,
): Promise<AiQueryResult> {
  const cleanQ = question.trim().toLowerCase()
  const rlsRole = toRlsRole(actor.role)

  // 1. OFF-TOPIC OR SECURITY OVERRIDE ATTEMPTS
  const offTopicKeywords = ['poem', 'capital of', 'weather', 'movie', 'song', 'sports', 'president', 'translate', 'ignore previous']
  if (offTopicKeywords.some((w) => cleanQ.includes(w))) {
    return {
      label: 'Insufficient Data',
      answer:
        'I am your Operafrika business assistant. I only answer questions directly related to your business sales, inventory, expenses, customers, and branch performance.',
      suggestedQuestions: [
        'What was our revenue this week?',
        'Which products are low on stock?',
        'What is our net profit this month?',
      ],
    }
  }

  // Resolve scope using the standard dashboard scope helper
  const scope = await withRls(
    {
      role: rlsRole,
      businessId: actor.businessId,
      branchId: actor.branchId,
      userId: actor.userId,
    },
    (tx) =>
      getDashboardScope(tx, {
        userId: actor.userId,
        businessId: actor.businessId,
        role: actor.role,
        branchParam: actor.branchId,
      }),
  )

  const timeframe = parseTimeframe(cleanQ)
  const branchIds = scope.branchIds
  const branchName = scope.selectedBranch ? scope.selectedBranch.name : 'All Branches (Consolidated)'

  // -------------------------------------------------------------
  // INTENT 1: PAYROLL OVERHEAD (CONFIDENTIAL - OWNER ONLY)
  // -------------------------------------------------------------
  if (cleanQ.includes('payroll') || cleanQ.includes('salary') || cleanQ.includes('wages') || cleanQ.includes('compensation')) {
    if (actor.role !== 'OWNER') {
      return {
        label: 'Insufficient Data',
        answer:
          'Access restricted: Salary and compensation records are strictly confidential and only accessible to the Business Owner.',
        suggestedQuestions: ['What is our revenue this week?', 'Which items are low on stock?'],
      }
    }

    const payrollData = await withRls(
      {
        role: rlsRole,
        businessId: actor.businessId,
        branchId: actor.branchId,
        userId: actor.userId,
      },
      async (tx) => {
        const records = await tx.payrollEntry.findMany({
          where: {
            user: { businessId: actor.businessId },
          },
          include: { user: { select: { email: true } } },
        })

        let totalSalary = 0
        let totalPaid = 0
        let totalUnpaid = 0

        for (const r of records) {
          const amt = Number(r.salaryAmount)
          totalSalary += amt
          if (r.status === InvoiceStatus.PAID) {
            totalPaid += amt
          } else {
            totalUnpaid += amt
          }
        }

        return { count: records.length, totalSalary, totalPaid, totalUnpaid }
      },
    )

    const label: AiAnswerLabel = payrollData.count > 0 ? 'Calculated Fact' : 'Insufficient Data'
    const summary =
      payrollData.count > 0
        ? `Total recorded payroll overhead across the business is ${formatNaira(payrollData.totalSalary, actor.currency)} across ${payrollData.count} staff records. Paid amount: ${formatNaira(payrollData.totalPaid, actor.currency)}. Outstanding unpaid salary: ${formatNaira(payrollData.totalUnpaid, actor.currency)}.`
        : 'No confidential payroll compensation records have been logged in the system yet.'

    const explanation = await generateAiExplanation({
      question,
      intent: 'PAYROLL',
      label,
      currency: actor.currency,
      businessName: actor.businessName,
      role: actor.role,
      dataSummary: summary,
    })

    return {
      answer: explanation,
      label,
      dataSnapshot: {
        metric: 'Total Payroll Overhead',
        value: formatNaira(payrollData.totalSalary, actor.currency),
        period: 'All-Time Logged',
        branchName: 'All Branches',
        items: [
          { label: 'Paid Compensation', value: formatNaira(payrollData.totalPaid, actor.currency) },
          { label: 'Unpaid Compensation', value: formatNaira(payrollData.totalUnpaid, actor.currency) },
          { label: 'Staff Count on Record', value: String(payrollData.count) },
        ],
      },
      suggestedQuestions: [
        'What was our net profit this month?',
        'What are our total expenses?',
        'What is our total revenue this week?',
      ],
    }
  }

  // -------------------------------------------------------------
  // INTENT 2: PROFIT & LOSS (NET PROFIT)
  // -------------------------------------------------------------
  if (cleanQ.includes('profit') || cleanQ.includes('net margin') || cleanQ.includes('loss')) {
    if (actor.role === 'STAFF') {
      return {
        label: 'Insufficient Data',
        answer:
          'Access restricted: Staff cashier accounts do not have permission to view net profit or financial summary records.',
        suggestedQuestions: ['What items are low on stock?', 'How many sales were made today?'],
      }
    }

    const pnl = await withRls(
      {
        role: rlsRole,
        businessId: actor.businessId,
        branchId: actor.branchId,
        userId: actor.userId,
      },
      (tx) =>
        calculateProfitLoss(tx, {
          businessId: actor.businessId,
          branchIds,
          combined: scope.isCombined,
          from: timeframe.from,
          to: timeframe.to,
        }),
    )

    const label: AiAnswerLabel = pnl.revenue > 0 || pnl.totalExpenses > 0 ? 'Calculated Fact' : 'Insufficient Data'
    const statusText = pnl.netProfit >= 0 ? 'profitable' : 'operating at a net loss'
    const summary = `For ${timeframe.label} in ${branchName}: Total Revenue is ${formatNaira(pnl.revenue, actor.currency)}, Total Operating Expenses are ${formatNaira(pnl.totalExpenses, actor.currency)} (including direct expenses of ${formatNaira(pnl.expenses, actor.currency)} and payroll overhead of ${formatNaira(pnl.payroll, actor.currency)}). Net Profit is ${formatNaira(pnl.netProfit, actor.currency)}. The business is currently ${statusText}.`

    const explanation = await generateAiExplanation({
      question,
      intent: 'PROFIT_LOSS',
      label,
      currency: actor.currency,
      businessName: actor.businessName,
      role: actor.role,
      dataSummary: summary,
    })

    return {
      answer: explanation,
      label,
      dataSnapshot: {
        metric: 'Net Profit',
        value: formatNaira(pnl.netProfit, actor.currency),
        period: timeframe.label,
        branchName,
        items: [
          { label: 'Total Revenue', value: formatNaira(pnl.revenue, actor.currency) },
          { label: 'Total Expenses', value: formatNaira(pnl.totalExpenses, actor.currency) },
          { label: 'Net Status', value: pnl.netProfit >= 0 ? 'Profitable' : 'Net Loss' },
        ],
      },
      suggestedQuestions: [
        'What are our biggest expense categories?',
        'What was our revenue this week?',
        'Which items are running low on stock?',
      ],
    }
  }

  // -------------------------------------------------------------
  // INTENT 3: EXPENSES & OVERHEAD
  // -------------------------------------------------------------
  if (cleanQ.includes('expense') || cleanQ.includes('spent') || cleanQ.includes('overhead') || cleanQ.includes('cost')) {
    if (actor.role === 'STAFF') {
      return {
        label: 'Insufficient Data',
        answer: 'Access restricted: Staff accounts do not have permission to view business expenses.',
        suggestedQuestions: ['What items are low on stock?', 'How many sales were made today?'],
      }
    }

    const expenseData = await withRls(
      {
        role: rlsRole,
        businessId: actor.businessId,
        branchId: actor.branchId,
        userId: actor.userId,
      },
      async (tx) => {
        const rows = await tx.expenseEntry.findMany({
          where: {
            branchId: { in: branchIds },
            date: { gte: timeframe.from, lt: timeframe.to },
          },
        })

        const categoryMap = new Map<string, number>()
        let total = 0
        for (const row of rows) {
          const amt = Number(row.amount)
          total += amt
          categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + amt)
        }

        const sortedCats = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        return { total, count: rows.length, topCategories: sortedCats }
      },
    )

    const label: AiAnswerLabel = expenseData.count > 0 ? 'Calculated Fact' : 'Insufficient Data'
    const topCatsList = expenseData.topCategories.map(([c, amt]) => `${c}: ${formatNaira(amt, actor.currency)}`).join(', ')
    const summary =
      expenseData.count > 0
        ? `Total recorded expenses for ${timeframe.label} in ${branchName} are ${formatNaira(expenseData.total, actor.currency)} across ${expenseData.count} transactions. Major expense breakdown: ${topCatsList || 'None'}.`
        : `No operating expenses have been logged for ${timeframe.label} in ${branchName}.`

    const explanation = await generateAiExplanation({
      question,
      intent: 'EXPENSES',
      label,
      currency: actor.currency,
      businessName: actor.businessName,
      role: actor.role,
      dataSummary: summary,
    })

    return {
      answer: explanation,
      label,
      dataSnapshot: {
        metric: 'Total Expenses',
        value: formatNaira(expenseData.total, actor.currency),
        period: timeframe.label,
        branchName,
        items: expenseData.topCategories.map(([cat, val]) => ({
          label: cat,
          value: formatNaira(val, actor.currency),
        })),
      },
      suggestedQuestions: [
        'What is our net profit this month?',
        'What was our revenue this week?',
        'Which products are low on stock?',
      ],
    }
  }

  // -------------------------------------------------------------
  // INTENT 4: INVENTORY & LOW STOCK
  // -------------------------------------------------------------
  if (cleanQ.includes('stock') || cleanQ.includes('inventory') || cleanQ.includes('reorder') || cleanQ.includes('product') || cleanQ.includes('item')) {
    const stockData = await withRls(
      {
        role: rlsRole,
        businessId: actor.businessId,
        branchId: actor.branchId,
        userId: actor.userId,
      },
      async (tx) => {
        const items = await tx.stockItem.findMany({
          where: { branchId: { in: branchIds } },
          include: { branch: { select: { name: true } } },
        })

        const lowStock = items.filter((item) => item.quantity <= item.reorderThreshold)
        const outOfStock = items.filter((item) => item.quantity <= 0)

        let totalInventoryCost = 0
        let totalInventoryValue = 0

        for (const item of items) {
          totalInventoryCost += item.quantity * Number(item.costPrice)
          totalInventoryValue += item.quantity * Number(item.sellingPrice)
        }

        return {
          totalProducts: items.length,
          lowStock,
          outOfStockCount: outOfStock.length,
          totalInventoryCost,
          totalInventoryValue,
        }
      },
    )

    const label: AiAnswerLabel = stockData.totalProducts > 0 ? 'Calculated Fact' : 'Insufficient Data'
    const lowStockNames = stockData.lowStock.slice(0, 5).map((i) => `${i.name} (${i.quantity} left, reorder at ${i.reorderThreshold})`).join('; ')
    const summary =
      stockData.totalProducts > 0
        ? `In ${branchName}, you currently have ${stockData.totalProducts} total catalog products. ${stockData.lowStock.length} items are at or below reorder threshold (${stockData.outOfStockCount} completely out of stock). Critical items: ${lowStockNames || 'None currently low'}. Total retail inventory value is ${formatNaira(stockData.totalInventoryValue, actor.currency)}.`
        : `No inventory stock items have been registered yet in ${branchName}.`

    const explanation = await generateAiExplanation({
      question,
      intent: 'INVENTORY',
      label,
      currency: actor.currency,
      businessName: actor.businessName,
      role: actor.role,
      dataSummary: summary,
    })

    return {
      answer: explanation,
      label,
      dataSnapshot: {
        metric: 'Low Stock Alert Items',
        value: `${stockData.lowStock.length} items`,
        branchName,
        items: [
          { label: 'Out of Stock Items', value: String(stockData.outOfStockCount) },
          { label: 'Total Catalog Products', value: String(stockData.totalProducts) },
          { label: 'Total Inventory Valuation', value: formatNaira(stockData.totalInventoryValue, actor.currency) },
        ],
      },
      suggestedQuestions: [
        'What was our top selling product this week?',
        'What is our total revenue today?',
        'Who owes us the most money?',
      ],
    }
  }

  // -------------------------------------------------------------
  // INTENT 5: CUSTOMER DEBT & UNPAID BALANCES
  // -------------------------------------------------------------
  if (cleanQ.includes('debt') || cleanQ.includes('owe') || cleanQ.includes('owing') || cleanQ.includes('debtor') || cleanQ.includes('credit')) {
    if (actor.role === 'STAFF') {
      return {
        label: 'Insufficient Data',
        answer: 'Access restricted: Staff accounts do not have permission to view aggregated customer debt ledgers.',
        suggestedQuestions: ['What items are low on stock?', 'How many sales were made today?'],
      }
    }

    const debtData = await withRls(
      {
        role: rlsRole,
        businessId: actor.businessId,
        branchId: actor.branchId,
        userId: actor.userId,
      },
      async (tx) => {
        const unpaidInvoices = await tx.invoice.findMany({
          where: {
            branchId: { in: branchIds },
            status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
          },
          include: { customer: { select: { name: true, contact: true } } },
        })

        let totalDebt = 0
        const debtorMap = new Map<string, number>()

        for (const inv of unpaidInvoices) {
          const invTotal = Number(inv.total)
          const paid = Number(inv.paymentAmount ?? 0)
          const balance = Math.max(0, invTotal - paid)
          totalDebt += balance

          const custName = inv.customer?.name || 'Walk-in Customer'
          debtorMap.set(custName, (debtorMap.get(custName) ?? 0) + balance)
        }

        const topDebtors = Array.from(debtorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        return {
          totalDebt,
          unpaidCount: unpaidInvoices.length,
          topDebtors,
        }
      },
    )

    const label: AiAnswerLabel = debtData.unpaidCount > 0 ? 'Calculated Fact' : 'Insufficient Data'
    const debtorList = debtData.topDebtors.map(([name, amt]) => `${name}: ${formatNaira(amt, actor.currency)}`).join(', ')
    const summary =
      debtData.unpaidCount > 0
        ? `In ${branchName}, total outstanding customer debt is ${formatNaira(debtData.totalDebt, actor.currency)} across ${debtData.unpaidCount} unpaid/partial invoices. Top customers with pending balances: ${debtorList}.`
        : `Great news! There is zero outstanding customer debt recorded in ${branchName}.`

    const explanation = await generateAiExplanation({
      question,
      intent: 'DEBT',
      label,
      currency: actor.currency,
      businessName: actor.businessName,
      role: actor.role,
      dataSummary: summary,
    })

    return {
      answer: explanation,
      label,
      dataSnapshot: {
        metric: 'Total Outstanding Debt',
        value: formatNaira(debtData.totalDebt, actor.currency),
        branchName,
        items: debtData.topDebtors.map(([name, amt]) => ({
          label: name,
          value: formatNaira(amt, actor.currency),
        })),
      },
      suggestedQuestions: [
        'What was our revenue this week?',
        'Which items are running low on stock?',
        'What is our net profit this month?',
      ],
    }
  }

  // -------------------------------------------------------------
  // INTENT 6: REVENUE & SALES (DEFAULT INTENT)
  // -------------------------------------------------------------
  const salesData = await withRls(
    {
      role: rlsRole,
      businessId: actor.businessId,
      branchId: actor.branchId,
      userId: actor.userId,
    },
    async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: {
          branchId: { in: branchIds },
          createdAt: { gte: timeframe.from, lt: timeframe.to },
        },
      })

      const directIncome = await tx.incomeEntry.findMany({
        where: {
          branchId: { in: branchIds },
          date: { gte: timeframe.from, lt: timeframe.to },
        },
      })

      let paidSales = 0
      let pendingSales = 0

      for (const inv of invoices) {
        const total = Number(inv.total)
        const paid = Number(inv.paymentAmount ?? 0)
        if (inv.status === InvoiceStatus.PAID) {
          paidSales += paid > 0 ? paid : total
        } else if (inv.status === InvoiceStatus.PARTIAL) {
          paidSales += paid
          pendingSales += Math.max(0, total - paid)
        } else {
          pendingSales += total
        }
      }

      let directIncomeTotal = 0
      for (const inc of directIncome) {
        directIncomeTotal += Number(inc.amount)
      }

      const totalRevenue = paidSales + directIncomeTotal
      return {
        totalRevenue,
        invoiceCount: invoices.length,
        pendingBalance: pendingSales,
        paidInvoicesCount: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      }
    },
  )

  const label: AiAnswerLabel = salesData.invoiceCount > 0 || salesData.totalRevenue > 0 ? 'Calculated Fact' : 'Insufficient Data'
  const summary =
    salesData.invoiceCount > 0 || salesData.totalRevenue > 0
      ? `For ${timeframe.label} in ${branchName}: Total Collected Revenue is ${formatNaira(salesData.totalRevenue, actor.currency)} from ${salesData.invoiceCount} invoices (${salesData.paidInvoicesCount} fully settled). Pending unpaid invoice total is ${formatNaira(salesData.pendingBalance, actor.currency)}.`
      : `No sales transactions have been recorded for ${timeframe.label} in ${branchName}.`

  const explanation = await generateAiExplanation({
    question,
    intent: 'SALES_REVENUE',
    label,
    currency: actor.currency,
    businessName: actor.businessName,
    role: actor.role,
    dataSummary: summary,
  })

  return {
    answer: explanation,
    label,
    dataSnapshot: {
      metric: 'Total Revenue',
      value: formatNaira(salesData.totalRevenue, actor.currency),
      period: timeframe.label,
      branchName,
      items: [
        { label: 'Invoices Issued', value: String(salesData.invoiceCount) },
        { label: 'Settled Invoices', value: String(salesData.paidInvoicesCount) },
        { label: 'Pending Uncollected', value: formatNaira(salesData.pendingBalance, actor.currency) },
      ],
    },
    suggestedQuestions: [
      'What are our top selling products?',
      'Which items are running low on stock?',
      'What is our net profit this month?',
    ],
  }
}

