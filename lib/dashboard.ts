import type { Prisma } from '@prisma/client'
import {
  calculateProfitLoss,
  type ProfitLossTotals,
} from '@/lib/profit-loss'

export interface DashboardBranch {
  id: string
  name: string
}

export interface DashboardScope {
  branches: DashboardBranch[]
  selectedBranch: DashboardBranch | null
  branchIds: string[]
  isCombined: boolean
  canViewAllBranches: boolean
  canViewProfitLoss: boolean
}

export interface LowStockItem {
  id: string
  name: string
  quantity: number
  reorderThreshold: number
  branchId: string
  branchName: string
}

export interface SalesTotal {
  total: number
  count: number
}

export interface DashboardMetrics {
  todaySales: SalesTotal
  weekSales: SalesTotal
  lowStockCount: number
  lowStockItems: LowStockItem[]
  profitLoss: ProfitLossTotals | null
}

export interface DashboardScopeInput {
  userId: string
  businessId: string
  role: string
  branchParam?: string
}

/**
 * Resolves the branches a dashboard request may read.
 *
 * Owner accounts hold no BranchAccess row and may view every branch or a
 * combined view. Manager and Staff accounts are fixed to their assigned
 * branch; a branch value from the client is never honored for them.
 */
export async function getDashboardScope(
  tx: Prisma.TransactionClient,
  input: DashboardScopeInput,
): Promise<DashboardScope> {
  const { userId, businessId, role, branchParam } = input

  if (role === 'OWNER') {
    const branches = await tx.branch.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    })

    const selectedBranch =
      branchParam ? branches.find((branch) => branch.id === branchParam) ?? null : null

    return {
      branches,
      selectedBranch,
      branchIds: selectedBranch
        ? [selectedBranch.id]
        : branches.map((branch) => branch.id),
      isCombined: selectedBranch === null,
      canViewAllBranches: true,
      canViewProfitLoss: true,
    }
  }

  if (role === 'MANAGER' || role === 'STAFF') {
    const access = await tx.branchAccess.findMany({
      where: { userId, branch: { businessId } },
      select: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const branches = access.map((record) => record.branch)
    const selectedBranch = branches[0] ?? null

    return {
      branches,
      selectedBranch,
      branchIds: selectedBranch ? [selectedBranch.id] : [],
      isCombined: false,
      canViewAllBranches: false,
      canViewProfitLoss: role === 'MANAGER',
    }
  }

  return {
    branches: [],
    selectedBranch: null,
    branchIds: [],
    isCombined: false,
    canViewAllBranches: false,
    canViewProfitLoss: false,
  }
}

function startOfDay(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

function startOfWeek(date: Date): Date {
  const value = startOfDay(date)
  const day = value.getDay()
  const offset = (day + 6) % 7
  value.setDate(value.getDate() - offset)
  return value
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

async function getSalesTotal(
  tx: Prisma.TransactionClient,
  branchIds: string[],
  from: Date,
  to: Date,
): Promise<SalesTotal> {
  if (branchIds.length === 0) return { total: 0, count: 0 }

  const result = await tx.invoice.aggregate({
    where: {
      branchId: { in: branchIds },
      createdAt: { gte: from, lt: to },
    },
    _sum: { total: true },
    _count: { _all: true },
  })

  return {
    total: Number(result._sum.total ?? 0),
    count: result._count._all,
  }
}

/**
 * Dashboard metrics for the resolved branch scope.
 *
 * `now` is injectable so the date boundaries can be tested without freezing
 * the system clock.
 */
export async function getDashboardMetrics(
  tx: Prisma.TransactionClient,
  businessId: string,
  scope: DashboardScope,
  now: Date = new Date(),
): Promise<DashboardMetrics> {
  if (scope.branchIds.length === 0) {
    return {
      todaySales: { total: 0, count: 0 },
      weekSales: { total: 0, count: 0 },
      lowStockCount: 0,
      lowStockItems: [],
      profitLoss: scope.canViewProfitLoss
        ? {
            income: 0,
            invoicePayments: 0,
            revenue: 0,
            expenses: 0,
            payroll: 0,
            totalExpenses: 0,
            netProfit: 0,
          }
        : null,
    }
  }

  const todayStart = startOfDay(now)
  const tomorrow = addDays(todayStart, 1)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  const lowStockWhere = {
    branchId: { in: scope.branchIds },
    quantity: { lte: tx.stockItem.fields.reorderThreshold },
  }

  const [todaySales, weekSales, lowStockCount, lowStockItems, profitLoss] =
    await Promise.all([
      getSalesTotal(tx, scope.branchIds, todayStart, tomorrow),
      getSalesTotal(tx, scope.branchIds, weekStart, tomorrow),
      tx.stockItem.count({ where: lowStockWhere }),
      tx.stockItem.findMany({
        where: lowStockWhere,
        select: {
          id: true,
          name: true,
          quantity: true,
          reorderThreshold: true,
          branch: { select: { id: true, name: true } },
        },
        orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
        take: 6,
      }),
      scope.canViewProfitLoss
        ? calculateProfitLoss(tx, {
            businessId,
            branchIds: scope.branchIds,
            combined: scope.isCombined,
            from: monthStart,
            to: tomorrow,
          })
        : Promise.resolve(null),
    ])

  return {
    todaySales,
    weekSales,
    lowStockCount,
    lowStockItems: lowStockItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      reorderThreshold: item.reorderThreshold,
      branchId: item.branch.id,
      branchName: item.branch.name,
    })),
    profitLoss,
  }
}
