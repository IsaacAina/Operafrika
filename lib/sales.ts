import { Prisma, InvoiceStatus, StockMovementType, AuditAction } from '@prisma/client'
import { writeAuditEntry } from '@/lib/audit-log'

export interface SalesActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export interface InvoiceItemDetail {
  id: string
  stockItemId: string
  stockItemName: string
  sku: string | null
  quantity: number
  price: number
  subtotal: number
}

export interface InvoiceDetail {
  id: string
  branchId: string
  branchName: string
  customerId: string | null
  customerName: string | null
  customerContact: string | null
  status: InvoiceStatus
  paymentMethod: string | null
  paymentAmount: number | null
  paymentDate: Date | null
  total: number
  balanceDue: number
  createdAt: Date
  items: InvoiceItemDetail[]
}

export interface InvoiceSummary {
  id: string
  branchId: string
  branchName: string
  customerId: string | null
  customerName: string | null
  status: InvoiceStatus
  paymentMethod: string | null
  paymentAmount: number
  total: number
  balanceDue: number
  itemCount: number
  createdAt: Date
}

export interface ListInvoicesInput {
  businessId: string
  branchIds: string[]
  search?: string
  status?: InvoiceStatus
  page?: number
  pageSize?: number
}

export interface CreateInvoiceItemInput {
  stockItemId: string
  quantity: number
  price: number
}

export interface CreateInvoiceInput {
  branchId: string
  customerId?: string | null
  items: CreateInvoiceItemInput[]
  status?: InvoiceStatus
  paymentMethod?: string | null
  paymentAmount?: number | null
}

export interface RecordPaymentInput {
  invoiceId: string
  amount: number
  paymentMethod: string
}

export class SalesError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'SalesError'
    this.status = status
  }
}

/**
 * Lists invoices for the authorized branches with pagination and search.
 */
export async function listInvoices(
  tx: Prisma.TransactionClient,
  input: ListInvoicesInput,
): Promise<{ invoices: InvoiceSummary[]; totalCount: number; page: number; pageSize: number; totalPages: number }> {
  if (input.branchIds.length === 0) {
    return { invoices: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }
  }

  const page = Math.max(1, input.page || 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20))
  const skip = (page - 1) * pageSize

  const whereClause: Prisma.InvoiceWhereInput = {
    branchId: { in: input.branchIds },
  }

  if (input.status) {
    whereClause.status = input.status
  }

  if (input.search && input.search.trim()) {
    const q = input.search.trim()
    whereClause.OR = [
      { id: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { contact: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const [totalCount, rows] = await Promise.all([
    tx.invoice.count({ where: whereClause }),
    tx.invoice.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true } },
        customer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  const invoices: InvoiceSummary[] = rows.map((inv) => {
    const total = Number(inv.total)
    const paid = Number(inv.paymentAmount ?? 0)
    const balanceDue = Math.max(0, total - paid)
    return {
      id: inv.id,
      branchId: inv.branchId,
      branchName: inv.branch.name,
      customerId: inv.customerId,
      customerName: inv.customer?.name ?? 'Walk-in Customer',
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      paymentAmount: paid,
      total,
      balanceDue,
      itemCount: inv._count.items,
      createdAt: inv.createdAt,
    }
  })

  return {
    invoices,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

/**
 * Retrieves a single invoice with full line items and customer details.
 */
export async function getInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const inv = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      branch: { select: { name: true } },
      customer: { select: { id: true, name: true, contact: true } },
      items: {
        include: {
          stockItem: {
            select: { name: true, sku: true },
          },
        },
      },
    },
  })

  if (!inv) return null

  const total = Number(inv.total)
  const paid = Number(inv.paymentAmount ?? 0)
  const balanceDue = Math.max(0, total - paid)

  return {
    id: inv.id,
    branchId: inv.branchId,
    branchName: inv.branch.name,
    customerId: inv.customerId,
    customerName: inv.customer?.name ?? 'Walk-in Customer',
    customerContact: inv.customer?.contact ?? null,
    status: inv.status,
    paymentMethod: inv.paymentMethod,
    paymentAmount: paid,
    paymentDate: inv.paymentDate,
    total,
    balanceDue,
    createdAt: inv.createdAt,
    items: inv.items.map((it) => ({
      id: it.id,
      stockItemId: it.stockItemId,
      stockItemName: it.stockItem.name,
      sku: it.stockItem.sku,
      quantity: it.quantity,
      price: Number(it.price),
      subtotal: it.quantity * Number(it.price),
    })),
  }
}

/**
 * Creates a new invoice with line items, decrements stock quantities,
 * and records stock movement and audit logs.
 *
 * Owner, Manager, and Staff are all permitted to create invoices in authorized branches.
 */
export async function createInvoice(
  tx: Prisma.TransactionClient,
  actor: SalesActor,
  input: CreateInvoiceInput,
): Promise<InvoiceDetail> {
  if (!input.items || input.items.length === 0) {
    throw new SalesError('An invoice must contain at least one line item.')
  }

  // Verify stock items and calculate total
  const stockItemIds = input.items.map((it) => it.stockItemId)
  const stockItems = await tx.stockItem.findMany({
    where: {
      id: { in: stockItemIds },
      branchId: input.branchId,
    },
  })

  if (stockItems.length !== stockItemIds.length) {
    throw new SalesError('One or more stock items were not found in this branch.')
  }

  const stockMap = new Map(stockItems.map((si) => [si.id, si]))

  let invoiceTotal = 0
  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new SalesError('Item quantity must be greater than zero.')
    }
    if (item.price < 0) {
      throw new SalesError('Item price cannot be negative.')
    }
    const stockItem = stockMap.get(item.stockItemId)
    if (!stockItem) {
      throw new SalesError(`Stock item not found: ${item.stockItemId}`)
    }
    if (stockItem.quantity < item.quantity) {
      throw new SalesError(
        `Insufficient stock for "${stockItem.name}". Available: ${stockItem.quantity}, Requested: ${item.quantity}`,
      )
    }
    invoiceTotal += item.quantity * item.price
  }

  // Determine status and payment details
  let status: InvoiceStatus = input.status || InvoiceStatus.UNPAID
  let paymentAmount: number | null = null
  let paymentDate: Date | null = null
  let paymentMethod = input.paymentMethod || null

  if (status === InvoiceStatus.PAID) {
    paymentAmount = input.paymentAmount !== undefined && input.paymentAmount !== null
      ? Number(input.paymentAmount)
      : invoiceTotal
    paymentDate = new Date()
  } else if (status === InvoiceStatus.PARTIAL) {
    paymentAmount = Number(input.paymentAmount || 0)
    if (paymentAmount <= 0 || paymentAmount >= invoiceTotal) {
      throw new SalesError('Partial payment must be greater than zero and less than invoice total.')
    }
    paymentDate = new Date()
  } else {
    status = InvoiceStatus.UNPAID
    paymentAmount = 0
    paymentDate = null
  }

  // 1. Create the Invoice
  const invoice = await tx.invoice.create({
    data: {
      branchId: input.branchId,
      customerId: input.customerId?.trim() || null,
      status,
      paymentMethod,
      paymentAmount: paymentAmount !== null ? new Prisma.Decimal(paymentAmount) : null,
      paymentDate,
      total: new Prisma.Decimal(invoiceTotal),
      items: {
        create: input.items.map((it) => ({
          stockItemId: it.stockItemId,
          quantity: it.quantity,
          price: new Prisma.Decimal(it.price),
        })),
      },
    },
    include: {
      branch: { select: { name: true } },
      customer: { select: { id: true, name: true, contact: true } },
      items: {
        include: {
          stockItem: { select: { name: true, sku: true } },
        },
      },
    },
  })

  // 2. Adjust stock levels and record OUT stock movement
  // When actor is Staff, stock table direct writes are elevated safely within the sale transaction.
  const isStaff = actor.role === 'STAFF'
  if (isStaff) {
    await tx.$queryRaw`select set_config('app.role', 'SYSTEM', true)`
  }

  try {
    for (const item of input.items) {
      const stockItem = stockMap.get(item.stockItemId)!
      const newQuantity = stockItem.quantity - item.quantity

      await tx.stockItem.update({
        where: { id: item.stockItemId },
        data: { quantity: newQuantity },
      })

      await tx.stockMovement.create({
        data: {
          stockItemId: item.stockItemId,
          type: StockMovementType.OUT,
          quantity: item.quantity,
          reason: `Sale - Invoice #${invoice.id.slice(-6)}`,
          relatedInvoiceId: invoice.id,
        },
      })
    }
  } finally {
    if (isStaff) {
      await tx.$queryRaw`select set_config('app.role', 'STAFF', true)`
    }
  }

  // 3. Record Audit Log
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: invoice.branchId,
    action: AuditAction.INVOICE_CREATED,
    resourceType: 'Invoice',
    resourceId: invoice.id,
    newValue: {
      total: invoiceTotal,
      status: invoice.status,
      customerId: invoice.customerId,
      itemCount: input.items.length,
    },
  })

  const total = Number(invoice.total)
  const paid = Number(invoice.paymentAmount ?? 0)
  const balanceDue = Math.max(0, total - paid)

  return {
    id: invoice.id,
    branchId: invoice.branchId,
    branchName: invoice.branch.name,
    customerId: invoice.customerId,
    customerName: invoice.customer?.name ?? 'Walk-in Customer',
    customerContact: invoice.customer?.contact ?? null,
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    paymentAmount: paid,
    paymentDate: invoice.paymentDate,
    total,
    balanceDue,
    createdAt: invoice.createdAt,
    items: invoice.items.map((it) => ({
      id: it.id,
      stockItemId: it.stockItemId,
      stockItemName: it.stockItem.name,
      sku: it.stockItem.sku,
      quantity: it.quantity,
      price: Number(it.price),
      subtotal: it.quantity * Number(it.price),
    })),
  }
}

/**
 * Records a payment against an existing invoice.
 * Restricted to Owner and Manager per the Permission Matrix (Staff blocked).
 */
export async function recordInvoicePayment(
  tx: Prisma.TransactionClient,
  actor: SalesActor,
  input: RecordPaymentInput,
): Promise<InvoiceDetail> {
  if (actor.role === 'STAFF') {
    throw new SalesError('Staff members cannot update invoices or record payments.', 403)
  }

  if (input.amount <= 0) {
    throw new SalesError('Payment amount must be greater than zero.')
  }

  const invoice = await tx.invoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      branch: { select: { name: true } },
      customer: { select: { id: true, name: true, contact: true } },
      items: {
        include: {
          stockItem: { select: { name: true, sku: true } },
        },
      },
    },
  })

  if (!invoice) {
    throw new SalesError('Invoice not found.', 404)
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new SalesError('This invoice is already fully paid.')
  }

  const invoiceTotal = Number(invoice.total)
  const currentPaid = Number(invoice.paymentAmount ?? 0)
  const newTotalPaid = currentPaid + input.amount

  if (newTotalPaid > invoiceTotal) {
    throw new SalesError(
      `Payment amount of ${input.amount} exceeds remaining balance of ${invoiceTotal - currentPaid}.`,
    )
  }

  const newStatus: InvoiceStatus =
    newTotalPaid >= invoiceTotal ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL

  const updated = await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      paymentAmount: new Prisma.Decimal(newTotalPaid),
      status: newStatus,
      paymentMethod: input.paymentMethod,
      paymentDate: new Date(),
    },
    include: {
      branch: { select: { name: true } },
      customer: { select: { id: true, name: true, contact: true } },
      items: {
        include: {
          stockItem: { select: { name: true, sku: true } },
        },
      },
    },
  })

  // Audit log payment update
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: invoice.branchId,
    action: AuditAction.INVOICE_STATUS_CHANGED,
    resourceType: 'Invoice',
    resourceId: invoice.id,
    previousValue: {
      status: invoice.status,
      paymentAmount: currentPaid,
    },
    newValue: {
      status: newStatus,
      paymentAmount: newTotalPaid,
      paymentMethod: input.paymentMethod,
    },
  })

  const total = Number(updated.total)
  const paid = Number(updated.paymentAmount ?? 0)
  const balanceDue = Math.max(0, total - paid)

  return {
    id: updated.id,
    branchId: updated.branchId,
    branchName: updated.branch.name,
    customerId: updated.customerId,
    customerName: updated.customer?.name ?? 'Walk-in Customer',
    customerContact: updated.customer?.contact ?? null,
    status: updated.status,
    paymentMethod: updated.paymentMethod,
    paymentAmount: paid,
    paymentDate: updated.paymentDate,
    total,
    balanceDue,
    createdAt: updated.createdAt,
    items: updated.items.map((it) => ({
      id: it.id,
      stockItemId: it.stockItemId,
      stockItemName: it.stockItem.name,
      sku: it.stockItem.sku,
      quantity: it.quantity,
      price: Number(it.price),
      subtotal: it.quantity * Number(it.price),
    })),
  }
}

/**
 * Cancels an invoice and restores the stock items via IN stock movement.
 * Restricted to Owner and Manager per the Permission Matrix (Staff blocked).
 */
export async function cancelInvoice(
  tx: Prisma.TransactionClient,
  actor: SalesActor,
  invoiceId: string,
): Promise<{ success: boolean; invoiceId: string }> {
  if (actor.role === 'STAFF') {
    throw new SalesError('Staff members cannot cancel invoices.', 403)
  }

  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
    },
  })

  if (!invoice) {
    throw new SalesError('Invoice not found.', 404)
  }

  // Restore stock levels for each item
  for (const item of invoice.items) {
    await tx.stockItem.update({
      where: { id: item.stockItemId },
      data: { quantity: { increment: item.quantity } },
    })

    await tx.stockMovement.create({
      data: {
        stockItemId: item.stockItemId,
        type: StockMovementType.IN,
        quantity: item.quantity,
        reason: `Restock - Canceled Invoice #${invoice.id.slice(-6)}`,
        relatedInvoiceId: invoice.id,
      },
    })
  }

  // In PRD, cancellation is an audit event
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: invoice.branchId,
    action: AuditAction.INVOICE_STATUS_CHANGED,
    resourceType: 'Invoice',
    resourceId: invoice.id,
    previousValue: { status: invoice.status, total: Number(invoice.total) },
    newValue: { status: 'CANCELED', restocked: true },
  })

  // Mark invoice total to 0 or delete items/status
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.UNPAID,
      paymentAmount: new Prisma.Decimal(0),
    },
  })

  return { success: true, invoiceId }
}

