import { Prisma } from '@prisma/client'

export interface FinancialActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export class FinancialError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'FinancialError'
    this.status = status
  }
}

// ==========================================
// INCOME TYPES & FUNCTIONS
// ==========================================

export interface IncomeEntryDetail {
  id: string
  branchId: string
  branchName: string
  customerId: string | null
  customerName: string | null
  amount: number
  date: Date
  note: string | null
  createdAt: Date
}

export interface ListIncomeInput {
  businessId: string
  branchIds: string[]
  search?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

export interface CreateIncomeInput {
  branchId: string
  customerId?: string | null
  amount: number
  date: Date
  note?: string | null
}

/**
 * Lists income entries across authorized branches with search and pagination.
 * Blocked for Staff per the Permission Matrix.
 */
export async function listIncomeEntries(
  tx: Prisma.TransactionClient,
  input: ListIncomeInput,
): Promise<{
  entries: IncomeEntryDetail[]
  totalCount: number
  totalAmount: number
  page: number
  pageSize: number
  totalPages: number
}> {
  if (input.branchIds.length === 0) {
    return { entries: [], totalCount: 0, totalAmount: 0, page: 1, pageSize: 20, totalPages: 0 }
  }

  const page = Math.max(1, input.page || 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20))
  const skip = (page - 1) * pageSize

  const whereClause: Prisma.IncomeEntryWhereInput = {
    branchId: { in: input.branchIds },
  }

  if (input.startDate || input.endDate) {
    whereClause.date = {}
    if (input.startDate) whereClause.date.gte = input.startDate
    if (input.endDate) whereClause.date.lte = input.endDate
  }

  if (input.search && input.search.trim()) {
    const q = input.search.trim()
    whereClause.OR = [
      { note: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const [totalCount, sumAgg, rows] = await Promise.all([
    tx.incomeEntry.count({ where: whereClause }),
    tx.incomeEntry.aggregate({
      where: whereClause,
      _sum: { amount: true },
    }),
    tx.incomeEntry.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
  ])

  const entries: IncomeEntryDetail[] = rows.map((r) => ({
    id: r.id,
    branchId: r.branchId,
    branchName: r.branch.name,
    customerId: r.customerId,
    customerName: r.customer?.name ?? null,
    amount: Number(r.amount),
    date: r.date,
    note: r.note,
    createdAt: r.createdAt,
  }))

  return {
    entries,
    totalCount,
    totalAmount: Number(sumAgg._sum.amount ?? 0),
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

/**
 * Creates an income entry.
 * Owner and Manager permitted. Staff blocked.
 */
export async function createIncomeEntry(
  tx: Prisma.TransactionClient,
  actor: FinancialActor,
  input: CreateIncomeInput,
): Promise<IncomeEntryDetail> {
  if (actor.role === 'STAFF') {
    throw new FinancialError('Staff accounts are not permitted to record income.', 403)
  }

  if (input.amount <= 0) {
    throw new FinancialError('Income amount must be greater than zero.')
  }

  // If customerId is provided, verify customer belongs to this branch
  if (input.customerId) {
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
      select: { branchId: true },
    })
    if (!customer || customer.branchId !== input.branchId) {
      throw new FinancialError('Selected customer does not exist in this branch.')
    }
  }

  const entry = await tx.incomeEntry.create({
    data: {
      branchId: input.branchId,
      customerId: input.customerId?.trim() || null,
      amount: new Prisma.Decimal(input.amount),
      date: input.date,
      note: input.note?.trim() || null,
    },
    include: {
      branch: { select: { name: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return {
    id: entry.id,
    branchId: entry.branchId,
    branchName: entry.branch.name,
    customerId: entry.customerId,
    customerName: entry.customer?.name ?? null,
    amount: Number(entry.amount),
    date: entry.date,
    note: entry.note,
    createdAt: entry.createdAt,
  }
}

/**
 * Deletes an income entry.
 * Owner and Manager permitted. Staff blocked.
 */
export async function deleteIncomeEntry(
  tx: Prisma.TransactionClient,
  actor: FinancialActor,
  id: string,
): Promise<{ success: boolean; id: string }> {
  if (actor.role === 'STAFF') {
    throw new FinancialError('Staff accounts are not permitted to delete income records.', 403)
  }

  const existing = await tx.incomeEntry.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new FinancialError('Income entry not found.', 404)
  }

  await tx.incomeEntry.delete({
    where: { id },
  })

  return { success: true, id }
}

// ==========================================
// EXPENSE TYPES & FUNCTIONS
// ==========================================

export const EXPENSE_CATEGORIES = [
  'Rent & Office',
  'Utilities & Bills',
  'Logistics & Delivery',
  'Supplies & Raw Materials',
  'Salaries & Casual Labor',
  'Maintenance & Repairs',
  'Marketing & Advertising',
  'Taxes & Regulatory',
  'Miscellaneous',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface ExpenseEntryDetail {
  id: string
  branchId: string
  branchName: string
  category: string
  amount: number
  date: Date
  note: string | null
  createdAt: Date
}

export interface ListExpenseInput {
  businessId: string
  branchIds: string[]
  category?: string
  search?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

export interface CreateExpenseInput {
  branchId: string
  category: string
  amount: number
  date: Date
  note?: string | null
}

/**
 * Lists expense entries across authorized branches with category filter and search.
 * Blocked for Staff per the Permission Matrix.
 */
export async function listExpenseEntries(
  tx: Prisma.TransactionClient,
  input: ListExpenseInput,
): Promise<{
  entries: ExpenseEntryDetail[]
  totalCount: number
  totalAmount: number
  categoryBreakdown: Array<{ category: string; amount: number; count: number }>
  page: number
  pageSize: number
  totalPages: number
}> {
  if (input.branchIds.length === 0) {
    return {
      entries: [],
      totalCount: 0,
      totalAmount: 0,
      categoryBreakdown: [],
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }
  }

  const page = Math.max(1, input.page || 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20))
  const skip = (page - 1) * pageSize

  const whereClause: Prisma.ExpenseEntryWhereInput = {
    branchId: { in: input.branchIds },
  }

  if (input.category && input.category.trim() && input.category !== 'ALL') {
    whereClause.category = input.category.trim()
  }

  if (input.startDate || input.endDate) {
    whereClause.date = {}
    if (input.startDate) whereClause.date.gte = input.startDate
    if (input.endDate) whereClause.date.lte = input.endDate
  }

  if (input.search && input.search.trim()) {
    const q = input.search.trim()
    whereClause.OR = [
      { note: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [totalCount, sumAgg, groupAgg, rows] = await Promise.all([
    tx.expenseEntry.count({ where: whereClause }),
    tx.expenseEntry.aggregate({
      where: whereClause,
      _sum: { amount: true },
    }),
    tx.expenseEntry.groupBy({
      by: ['category'],
      where: { branchId: { in: input.branchIds } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    tx.expenseEntry.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
  ])

  const entries: ExpenseEntryDetail[] = rows.map((r) => ({
    id: r.id,
    branchId: r.branchId,
    branchName: r.branch.name,
    category: r.category,
    amount: Number(r.amount),
    date: r.date,
    note: r.note,
    createdAt: r.createdAt,
  }))

  const categoryBreakdown = groupAgg.map((g) => ({
    category: g.category,
    amount: Number(g._sum.amount ?? 0),
    count: g._count._all,
  }))

  return {
    entries,
    totalCount,
    totalAmount: Number(sumAgg._sum.amount ?? 0),
    categoryBreakdown,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

/**
 * Creates an expense entry.
 * Owner and Manager permitted. Staff blocked.
 */
export async function createExpenseEntry(
  tx: Prisma.TransactionClient,
  actor: FinancialActor,
  input: CreateExpenseInput,
): Promise<ExpenseEntryDetail> {
  if (actor.role === 'STAFF') {
    throw new FinancialError('Staff accounts are not permitted to record expenses.', 403)
  }

  if (input.amount <= 0) {
    throw new FinancialError('Expense amount must be greater than zero.')
  }

  if (!input.category || !input.category.trim()) {
    throw new FinancialError('Expense category is required.')
  }

  const entry = await tx.expenseEntry.create({
    data: {
      branchId: input.branchId,
      category: input.category.trim(),
      amount: new Prisma.Decimal(input.amount),
      date: input.date,
      note: input.note?.trim() || null,
    },
    include: {
      branch: { select: { name: true } },
    },
  })

  return {
    id: entry.id,
    branchId: entry.branchId,
    branchName: entry.branch.name,
    category: entry.category,
    amount: Number(entry.amount),
    date: entry.date,
    note: entry.note,
    createdAt: entry.createdAt,
  }
}

/**
 * Deletes an expense entry.
 * Owner and Manager permitted. Staff blocked.
 */
export async function deleteExpenseEntry(
  tx: Prisma.TransactionClient,
  actor: FinancialActor,
  id: string,
): Promise<{ success: boolean; id: string }> {
  if (actor.role === 'STAFF') {
    throw new FinancialError('Staff accounts are not permitted to delete expense records.', 403)
  }

  const existing = await tx.expenseEntry.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new FinancialError('Expense entry not found.', 404)
  }

  await tx.expenseEntry.delete({
    where: { id },
  })

  return { success: true, id }
}

