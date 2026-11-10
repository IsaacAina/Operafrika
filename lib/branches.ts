import { Prisma, Role, AuditAction } from '@prisma/client'
import { writeAuditEntry } from '@/lib/audit-log'

export interface BranchActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export class BranchError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'BranchError'
    this.status = status
  }
}

export interface BranchSummary {
  id: string
  name: string
  address: string | null
  contactInfo: string | null
  createdAt: Date
  staffCount: number
  stockCount: number
  invoiceCount: number
  assignedManagerName: string | null
  assignedManagerEmail: string | null
}

export interface CreateBranchInput {
  name: string
  address?: string
  contactInfo?: string
}

export interface UpdateBranchInput {
  name?: string
  address?: string
  contactInfo?: string
}

/**
 * Lists branches according to the Permission Matrix:
 * Owner reads across the business.
 * Manager and Staff read their assigned branch only.
 */
export async function listBranches(
  tx: Prisma.TransactionClient,
  actor: BranchActor,
): Promise<BranchSummary[]> {
  const isOwner = actor.role === 'OWNER'

  let branchIds: string[] | undefined

  if (!isOwner) {
    const access = await tx.branchAccess.findFirst({
      where: { userId: actor.userId },
      select: { branchId: true },
    })

    if (!access) return []
    branchIds = [access.branchId]
  }

  const whereClause: Prisma.BranchWhereInput = {
    businessId: actor.businessId,
  }

  if (branchIds) {
    whereClause.id = { in: branchIds }
  }

  const branches = await tx.branch.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          branchAccess: true,
          stockItems: true,
          invoices: true,
        },
      },
      branchAccess: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return branches.map((b) => {
    const manager = b.branchAccess.find((ba) => ba.user.role === Role.MANAGER)?.user

    return {
      id: b.id,
      name: b.name,
      address: b.address,
      contactInfo: b.contactInfo,
      createdAt: b.createdAt,
      staffCount: b._count.branchAccess,
      stockCount: b._count.stockItems,
      invoiceCount: b._count.invoices,
      assignedManagerName: manager ? manager.email.split('@')[0] : null,
      assignedManagerEmail: manager ? manager.email : null,
    }
  })
}

/**
 * Creates a new physical branch for the business.
 * Strictly restricted to Owner accounts.
 */
export async function createBranch(
  tx: Prisma.TransactionClient,
  actor: BranchActor,
  input: CreateBranchInput,
): Promise<BranchSummary> {
  if (actor.role !== 'OWNER') {
    throw new BranchError('Only Business Owners can create physical branches.', 403)
  }

  const trimmedName = input.name.trim()
  if (!trimmedName) {
    throw new BranchError('Branch name is required.', 400)
  }

  const branch = await tx.branch.create({
    data: {
      businessId: actor.businessId,
      name: trimmedName,
      address: input.address?.trim() || null,
      contactInfo: input.contactInfo?.trim() || null,
    },
  })

  await writeAuditEntry(tx, {
    businessId: actor.businessId,
    branchId: branch.id,
    userId: actor.userId,
    actorEmail: actor.email,
    action: AuditAction.ROLE_PERMISSION_CHANGED,
    resourceType: 'Branch',
    resourceId: branch.id,
    newValue: { name: branch.name, address: branch.address, contactInfo: branch.contactInfo },
  })

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    contactInfo: branch.contactInfo,
    createdAt: branch.createdAt,
    staffCount: 0,
    stockCount: 0,
    invoiceCount: 0,
    assignedManagerName: null,
    assignedManagerEmail: null,
  }
}

/**
 * Updates a branch's details (name, address, contact).
 * Strictly restricted to Owner accounts.
 */
export async function updateBranch(
  tx: Prisma.TransactionClient,
  actor: BranchActor,
  branchId: string,
  input: UpdateBranchInput,
): Promise<BranchSummary> {
  if (actor.role !== 'OWNER') {
    throw new BranchError('Only Business Owners can modify branch details.', 403)
  }

  const existing = await tx.branch.findFirst({
    where: { id: branchId, businessId: actor.businessId },
  })

  if (!existing) {
    throw new BranchError('Branch not found.', 404)
  }

  const dataToUpdate: Prisma.BranchUpdateInput = {}
  if (input.name !== undefined) {
    const t = input.name.trim()
    if (!t) throw new BranchError('Branch name cannot be empty.', 400)
    dataToUpdate.name = t
  }
  if (input.address !== undefined) {
    dataToUpdate.address = input.address.trim() || null
  }
  if (input.contactInfo !== undefined) {
    dataToUpdate.contactInfo = input.contactInfo.trim() || null
  }

  const updated = await tx.branch.update({
    where: { id: branchId },
    data: dataToUpdate,
    include: {
      _count: {
        select: {
          branchAccess: true,
          stockItems: true,
          invoices: true,
        },
      },
      branchAccess: {
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      },
    },
  })

  await writeAuditEntry(tx, {
    businessId: actor.businessId,
    branchId: updated.id,
    userId: actor.userId,
    actorEmail: actor.email,
    action: AuditAction.ROLE_PERMISSION_CHANGED,
    resourceType: 'Branch',
    resourceId: updated.id,
    previousValue: { name: existing.name, address: existing.address, contactInfo: existing.contactInfo },
    newValue: { name: updated.name, address: updated.address, contactInfo: updated.contactInfo },
  })

  const manager = updated.branchAccess.find((ba) => ba.user.role === Role.MANAGER)?.user

  return {
    id: updated.id,
    name: updated.name,
    address: updated.address,
    contactInfo: updated.contactInfo,
    createdAt: updated.createdAt,
    staffCount: updated._count.branchAccess,
    stockCount: updated._count.stockItems,
    invoiceCount: updated._count.invoices,
    assignedManagerName: manager ? manager.email.split('@')[0] : null,
    assignedManagerEmail: manager ? manager.email : null,
  }
}

