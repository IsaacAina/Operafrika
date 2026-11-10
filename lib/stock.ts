import { Prisma, StockMovementType, AuditAction } from '@prisma/client'
import { writeAuditEntry } from '@/lib/audit-log'

export interface StockItemWithBranch {
  id: string
  branchId: string
  branchName: string
  name: string
  sku: string | null
  quantity: number
  costPrice: number
  sellingPrice: number
  reorderThreshold: number
  isLowStock: boolean
  isOutOfStock: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StockMovementRecord {
  id: string
  stockItemId: string
  itemName: string
  branchName: string
  type: StockMovementType
  quantity: number
  reason: string
  createdAt: Date
}

export interface ListStockInput {
  businessId: string
  branchIds: string[]
  search?: string
  lowStockOnly?: boolean
}

export interface CreateStockItemInput {
  branchId: string
  name: string
  sku?: string | null
  quantity: number
  costPrice: number
  sellingPrice: number
  reorderThreshold: number
}

export interface RecordMovementInput {
  stockItemId: string
  type: StockMovementType
  quantity: number
  reason: string
}

export interface UpdateStockItemInput {
  name?: string
  sku?: string | null
  costPrice?: number
  sellingPrice?: number
  reorderThreshold?: number
}

export interface StockActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export class StockError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'StockError'
    this.status = status
  }
}

/**
 * Lists stock items within authorized branches.
 */
export async function listStockItems(
  tx: Prisma.TransactionClient,
  input: ListStockInput,
): Promise<StockItemWithBranch[]> {
  if (input.branchIds.length === 0) return []

  const whereClause: Prisma.StockItemWhereInput = {
    branchId: { in: input.branchIds },
  }

  if (input.search && input.search.trim()) {
    const q = input.search.trim()
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ]
  }

  const items = await tx.stockItem.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true } },
    },
    orderBy: [{ name: 'asc' }],
  })

  return items
    .map((item) => {
      const quantity = item.quantity
      const reorderThreshold = item.reorderThreshold
      const isLowStock = quantity <= reorderThreshold
      const isOutOfStock = quantity === 0

      return {
        id: item.id,
        branchId: item.branchId,
        branchName: item.branch.name,
        name: item.name,
        sku: item.sku,
        quantity,
        costPrice: Number(item.costPrice),
        sellingPrice: Number(item.sellingPrice),
        reorderThreshold,
        isLowStock,
        isOutOfStock,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    })
    .filter((item) => (input.lowStockOnly ? item.isLowStock : true))
}

/**
 * Lists recent stock movements within authorized branches.
 */
export async function listRecentStockMovements(
  tx: Prisma.TransactionClient,
  branchIds: string[],
  take = 20,
): Promise<StockMovementRecord[]> {
  if (branchIds.length === 0) return []

  const movements = await tx.stockMovement.findMany({
    where: {
      stockItem: {
        branchId: { in: branchIds },
      },
    },
    include: {
      stockItem: {
        select: {
          name: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
  })

  return movements.map((m) => ({
    id: m.id,
    stockItemId: m.stockItemId,
    itemName: m.stockItem.name,
    branchName: m.stockItem.branch.name,
    type: m.type,
    quantity: m.quantity,
    reason: m.reason,
    createdAt: m.createdAt,
  }))
}

/**
 * Creates a new stock item.
 *
 * Owner and Manager roles are permitted. Staff has read-only access.
 * If initial quantity > 0, records an IN movement and audit log entry.
 */
export async function createStockItem(
  tx: Prisma.TransactionClient,
  actor: StockActor,
  input: CreateStockItemInput,
): Promise<StockItemWithBranch> {
  if (actor.role === 'STAFF') {
    throw new StockError('Staff accounts have read-only stock access.', 403)
  }

  if (input.quantity < 0) {
    throw new StockError('Initial quantity cannot be negative.')
  }
  if (input.costPrice < 0 || input.sellingPrice < 0) {
    throw new StockError('Prices cannot be negative.')
  }

  // 1. Create StockItem
  const item = await tx.stockItem.create({
    data: {
      branchId: input.branchId,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      quantity: input.quantity,
      costPrice: new Prisma.Decimal(input.costPrice),
      sellingPrice: new Prisma.Decimal(input.sellingPrice),
      reorderThreshold: input.reorderThreshold,
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  })

  // 2. If initial quantity > 0, record initial stock movement and audit log
  if (input.quantity > 0) {
    await tx.stockMovement.create({
      data: {
        stockItemId: item.id,
        type: StockMovementType.IN,
        quantity: input.quantity,
        reason: 'Initial stock on creation',
      },
    })

    await writeAuditEntry(tx, {
      userId: actor.userId,
      actorEmail: actor.email,
      businessId: actor.businessId,
      branchId: item.branchId,
      action: AuditAction.STOCK_MOVEMENT_RECORDED,
      resourceType: 'StockItem',
      resourceId: item.id,
      previousValue: { quantity: 0 },
      newValue: {
        quantity: input.quantity,
        type: StockMovementType.IN,
        reason: 'Initial stock on creation',
      },
    })
  }

  return {
    id: item.id,
    branchId: item.branchId,
    branchName: item.branch.name,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    costPrice: Number(item.costPrice),
    sellingPrice: Number(item.sellingPrice),
    reorderThreshold: item.reorderThreshold,
    isLowStock: item.quantity <= item.reorderThreshold,
    isOutOfStock: item.quantity === 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

/**
 * Records a stock movement (IN or OUT) and updates the stock level.
 *
 * Writes an audit log entry in the same transaction.
 */
export async function recordStockMovement(
  tx: Prisma.TransactionClient,
  actor: StockActor,
  input: RecordMovementInput,
): Promise<{ item: StockItemWithBranch; movement: StockMovementRecord }> {
  if (actor.role === 'STAFF') {
    throw new StockError('Staff accounts cannot record stock movements.', 403)
  }

  if (input.quantity <= 0) {
    throw new StockError('Movement quantity must be greater than zero.')
  }

  const item = await tx.stockItem.findUnique({
    where: { id: input.stockItemId },
    include: {
      branch: { select: { id: true, name: true } },
    },
  })

  if (!item) {
    throw new StockError('Stock item not found.', 404)
  }

  if (input.type === StockMovementType.OUT && item.quantity < input.quantity) {
    throw new StockError(
      `Insufficient stock. Available: ${item.quantity}, requested: ${input.quantity}`,
    )
  }

  const previousQuantity = item.quantity
  const newQuantity =
    input.type === StockMovementType.IN
      ? item.quantity + input.quantity
      : item.quantity - input.quantity

  // Update quantity
  const updatedItem = await tx.stockItem.update({
    where: { id: item.id },
    data: { quantity: newQuantity },
  })

  // Create movement record
  const movement = await tx.stockMovement.create({
    data: {
      stockItemId: item.id,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason.trim(),
    },
  })

  // Write audit entry in the same transaction
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: item.branchId,
    action: AuditAction.STOCK_MOVEMENT_RECORDED,
    resourceType: 'StockItem',
    resourceId: item.id,
    previousValue: { quantity: previousQuantity },
    newValue: {
      quantity: newQuantity,
      movementType: input.type,
      changeQuantity: input.quantity,
      reason: input.reason.trim(),
    },
  })

  return {
    item: {
      id: updatedItem.id,
      branchId: updatedItem.branchId,
      branchName: item.branch.name,
      name: updatedItem.name,
      sku: updatedItem.sku,
      quantity: updatedItem.quantity,
      costPrice: Number(updatedItem.costPrice),
      sellingPrice: Number(updatedItem.sellingPrice),
      reorderThreshold: updatedItem.reorderThreshold,
      isLowStock: updatedItem.quantity <= updatedItem.reorderThreshold,
      isOutOfStock: updatedItem.quantity === 0,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    },
    movement: {
      id: movement.id,
      stockItemId: movement.stockItemId,
      itemName: item.name,
      branchName: item.branch.name,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      createdAt: movement.createdAt,
    },
  }
}

/**
 * Updates stock item properties (excluding quantity, which requires a movement).
 */
export async function updateStockItem(
  tx: Prisma.TransactionClient,
  actor: StockActor,
  itemId: string,
  input: UpdateStockItemInput,
): Promise<StockItemWithBranch> {
  if (actor.role === 'STAFF') {
    throw new StockError('Staff accounts cannot edit stock items.', 403)
  }

  const existing = await tx.stockItem.findUnique({
    where: { id: itemId },
    include: { branch: { select: { id: true, name: true } } },
  })

  if (!existing) {
    throw new StockError('Stock item not found.', 404)
  }

  const data: Prisma.StockItemUpdateInput = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.sku !== undefined) data.sku = input.sku?.trim() || null
  if (input.costPrice !== undefined) {
    if (input.costPrice < 0) throw new StockError('Cost price cannot be negative.')
    data.costPrice = new Prisma.Decimal(input.costPrice)
  }
  if (input.sellingPrice !== undefined) {
    if (input.sellingPrice < 0) throw new StockError('Selling price cannot be negative.')
    data.sellingPrice = new Prisma.Decimal(input.sellingPrice)
  }
  if (input.reorderThreshold !== undefined) {
    if (input.reorderThreshold < 0) throw new StockError('Threshold cannot be negative.')
    data.reorderThreshold = input.reorderThreshold
  }

  const updated = await tx.stockItem.update({
    where: { id: itemId },
    data,
  })

  return {
    id: updated.id,
    branchId: updated.branchId,
    branchName: existing.branch.name,
    name: updated.name,
    sku: updated.sku,
    quantity: updated.quantity,
    costPrice: Number(updated.costPrice),
    sellingPrice: Number(updated.sellingPrice),
    reorderThreshold: updated.reorderThreshold,
    isLowStock: updated.quantity <= updated.reorderThreshold,
    isOutOfStock: updated.quantity === 0,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }
}

