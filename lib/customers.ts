import { Prisma, AuditAction, InvoiceStatus } from '@prisma/client'
import { writeAuditEntry } from '@/lib/audit-log'

export interface CustomerWithStats {
  id: string
  branchId: string
  branchName: string
  name: string
  contact: string | null
  createdAt: Date
  updatedAt: Date
  invoiceCount: number
  totalSpent: number
  outstandingBalance: number
}

export interface ListCustomersInput {
  businessId: string
  branchIds: string[]
  search?: string
  page?: number
  pageSize?: number
}

export interface ListCustomersResult {
  customers: CustomerWithStats[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateCustomerInput {
  branchId: string
  name: string
  contact?: string | null
}

export interface UpdateCustomerInput {
  name?: string
  contact?: string | null
}

export interface CustomerActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export class CustomerError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'CustomerError'
    this.status = status
  }
}

/**
 * Lists customers within authorized branches with search, pagination, and transaction totals.
 */
export async function listCustomers(
  tx: Prisma.TransactionClient,
  input: ListCustomersInput,
): Promise<ListCustomersResult> {
  if (input.branchIds.length === 0) {
    return {
      customers: [],
      totalCount: 0,
      page: 1,
      pageSize: input.pageSize || 15,
      totalPages: 0,
    }
  }

  const page = Math.max(1, input.page || 1)
  const pageSize = Math.max(1, Math.min(100, input.pageSize || 15))
  const skip = (page - 1) * pageSize

  const whereClause: Prisma.CustomerWhereInput = {
    branchId: { in: input.branchIds },
  }

  if (input.search && input.search.trim()) {
    const q = input.search.trim()
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { contact: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [totalCount, rows] = await Promise.all([
    tx.customer.count({ where: whereClause }),
    tx.customer.findMany({
      where: whereClause,
      include: {
        branch: { select: { id: true, name: true } },
        invoices: {
          select: {
            id: true,
            status: true,
            total: true,
            paymentAmount: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
      skip,
      take: pageSize,
    }),
  ])

  const customers: CustomerWithStats[] = rows.map((customer) => {
    let totalSpent = 0
    let outstandingBalance = 0

    for (const inv of customer.invoices) {
      const invTotal = Number(inv.total)
      const paidAmount = Number(inv.paymentAmount ?? 0)

      if (inv.status === InvoiceStatus.PAID) {
        totalSpent += paidAmount > 0 ? paidAmount : invTotal
      } else if (inv.status === InvoiceStatus.PARTIAL) {
        totalSpent += paidAmount
        outstandingBalance += Math.max(0, invTotal - paidAmount)
      } else if (inv.status === InvoiceStatus.UNPAID) {
        outstandingBalance += invTotal
      }
    }

    return {
      id: customer.id,
      branchId: customer.branchId,
      branchName: customer.branch.name,
      name: customer.name,
      contact: customer.contact,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      invoiceCount: customer.invoices.length,
      totalSpent,
      outstandingBalance,
    }
  })

  return {
    customers,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

/**
 * Creates a new customer profile.
 *
 * Owner, Manager, and Staff roles are all permitted to create customers in their scope.
 */
export async function createCustomer(
  tx: Prisma.TransactionClient,
  actor: CustomerActor,
  input: CreateCustomerInput,
): Promise<CustomerWithStats> {
  const name = input.name.trim()
  if (!name) {
    throw new CustomerError('Customer name is required.')
  }

  const customer = await tx.customer.create({
    data: {
      branchId: input.branchId,
      name,
      contact: input.contact?.trim() || null,
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  })

  return {
    id: customer.id,
    branchId: customer.branchId,
    branchName: customer.branch.name,
    name: customer.name,
    contact: customer.contact,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    invoiceCount: 0,
    totalSpent: 0,
    outstandingBalance: 0,
  }
}

/**
 * Updates an existing customer profile.
 *
 * Owner and Manager roles are permitted. Staff has NO update permissions per Permission Matrix.
 */
export async function updateCustomer(
  tx: Prisma.TransactionClient,
  actor: CustomerActor,
  customerId: string,
  input: UpdateCustomerInput,
): Promise<CustomerWithStats> {
  if (actor.role === 'STAFF') {
    throw new CustomerError('Staff accounts cannot update customer profiles.', 403)
  }

  const existing = await tx.customer.findUnique({
    where: { id: customerId },
    include: {
      branch: { select: { id: true, name: true } },
      invoices: {
        select: {
          id: true,
          status: true,
          total: true,
          paymentAmount: true,
        },
      },
    },
  })

  if (!existing) {
    throw new CustomerError('Customer not found.', 404)
  }

  const data: Prisma.CustomerUpdateInput = {}
  if (input.name !== undefined) {
    const trimmed = input.name.trim()
    if (!trimmed) throw new CustomerError('Customer name cannot be empty.')
    data.name = trimmed
  }
  if (input.contact !== undefined) {
    data.contact = input.contact?.trim() || null
  }

  const updated = await tx.customer.update({
    where: { id: customerId },
    data,
  })

  // Write audit entry in the same transaction
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: existing.branchId,
    action: AuditAction.CUSTOMER_RECORD_CHANGED,
    resourceType: 'Customer',
    resourceId: existing.id,
    previousValue: { name: existing.name, contact: existing.contact },
    newValue: { name: updated.name, contact: updated.contact },
  })

  let totalSpent = 0
  let outstandingBalance = 0
  for (const inv of existing.invoices) {
    const invTotal = Number(inv.total)
    const paidAmount = Number(inv.paymentAmount ?? 0)
    if (inv.status === InvoiceStatus.PAID) {
      totalSpent += paidAmount > 0 ? paidAmount : invTotal
    } else if (inv.status === InvoiceStatus.PARTIAL) {
      totalSpent += paidAmount
      outstandingBalance += Math.max(0, invTotal - paidAmount)
    } else if (inv.status === InvoiceStatus.UNPAID) {
      outstandingBalance += invTotal
    }
  }

  return {
    id: updated.id,
    branchId: updated.branchId,
    branchName: existing.branch.name,
    name: updated.name,
    contact: updated.contact,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    invoiceCount: existing.invoices.length,
    totalSpent,
    outstandingBalance,
  }
}

/**
 * Imports multiple customers from parsed CSV data.
 */
export async function importCustomers(
  tx: Prisma.TransactionClient,
  actor: CustomerActor,
  branchId: string,
  records: Array<{ name: string; contact?: string | null }>,
): Promise<{ importedCount: number; errors: string[] }> {
  const errors: string[] = []
  let importedCount = 0

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const name = row?.name?.trim()

    if (!name) {
      errors.push(`Row ${i + 1}: Name is required`)
      continue
    }

    try {
      await tx.customer.create({
        data: {
          branchId,
          name,
          contact: row?.contact?.trim() || null,
        },
      })
      importedCount++
    } catch (err: unknown) {
      const error = err as Error
      errors.push(`Row ${i + 1} (${name}): ${error.message}`)
    }
  }

  return { importedCount, errors }
}

/**
 * Deletes a customer profile within the actor's authorized business/branch scope.
 * Restricted to Owner and Manager roles.
 * Decouples any associated invoices and income entries by nullifying their customerId
 * so historical transaction histories and accounting records remain intact.
 */
export async function deleteCustomer(
  tx: Prisma.TransactionClient,
  actor: CustomerActor,
  customerId: string,
): Promise<{ success: boolean; id: string }> {
  if (actor.role === 'STAFF') {
    throw new CustomerError('Staff accounts cannot delete customer profiles.', 403)
  }

  const existing = await tx.customer.findUnique({
    where: { id: customerId },
    include: {
      invoices: { select: { id: true } },
      incomeEntries: { select: { id: true } },
    },
  })

  if (!existing) {
    throw new CustomerError('Customer not found.', 404)
  }

  if (existing.invoices.length > 0) {
    await tx.invoice.updateMany({
      where: { customerId },
      data: { customerId: null },
    })
  }

  if (existing.incomeEntries.length > 0) {
    await tx.incomeEntry.updateMany({
      where: { customerId },
      data: { customerId: null },
    })
  }

  await tx.customer.delete({
    where: { id: customerId },
  })

  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: existing.branchId,
    action: AuditAction.CUSTOMER_RECORD_CHANGED,
    resourceType: 'Customer',
    resourceId: existing.id,
    previousValue: { name: existing.name, contact: existing.contact },
    newValue: { deleted: true },
  })

  return { success: true, id: customerId }
}

/**
 * Retrieves all customers within authorized branches for CSV export.
 */
export async function exportCustomers(
  tx: Prisma.TransactionClient,
  input: {
    branchIds: string[]
    search?: string
  },
): Promise<CustomerWithStats[]> {
  if (input.branchIds.length === 0) {
    return []
  }

  const whereClause: Prisma.CustomerWhereInput = {
    branchId: { in: input.branchIds },
  }

  if (input.search && input.search.trim()) {
    const q = input.search.trim()
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { contact: { contains: q, mode: 'insensitive' } },
    ]
  }

  const rows = await tx.customer.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true } },
      invoices: {
        select: {
          id: true,
          status: true,
          total: true,
          paymentAmount: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }],
    take: 5000,
  })

  return rows.map((customer) => {
    let totalSpent = 0
    let outstandingBalance = 0

    for (const inv of customer.invoices) {
      const invTotal = Number(inv.total)
      const paidAmount = Number(inv.paymentAmount ?? 0)

      if (inv.status === InvoiceStatus.PAID) {
        totalSpent += paidAmount > 0 ? paidAmount : invTotal
      } else if (inv.status === InvoiceStatus.PARTIAL) {
        totalSpent += paidAmount
        outstandingBalance += Math.max(0, invTotal - paidAmount)
      } else if (inv.status === InvoiceStatus.UNPAID) {
        outstandingBalance += invTotal
      }
    }

    return {
      id: customer.id,
      branchId: customer.branchId,
      branchName: customer.branch.name,
      name: customer.name,
      contact: customer.contact,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      invoiceCount: customer.invoices.length,
      totalSpent,
      outstandingBalance,
    }
  })
}


