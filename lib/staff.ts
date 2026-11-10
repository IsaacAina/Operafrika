import { Prisma, Role, InvoiceStatus, AuditAction } from '@prisma/client'
import { writeAuditEntry } from '@/lib/audit-log'
import { hashPassword } from '@/lib/password'

export interface StaffActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export class StaffError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'StaffError'
    this.status = status
    Object.setPrototypeOf(this, StaffError.prototype)
  }
}

// ==========================================
// STAFF DIRECTORY TYPES & FUNCTIONS
// ==========================================

export interface StaffMemberDetail {
  id: string
  email: string
  role: Role
  createdAt: Date
  branchId: string | null
  branchName: string | null
  isEmailVerified: boolean
  isBanned: boolean
}

export interface ListStaffInput {
  businessId: string
  branchId?: string
}

export interface CreateStaffMemberInput {
  email: string
  password: string
  role: Role
  branchId: string
}

export interface UpdateStaffMemberInput {
  userId: string
  role?: Role
  branchId?: string
}

/**
 * Lists staff members.
 * Owner can list all across branches or filter by branch.
 * Manager can only list staff within their assigned branch.
 * Staff accounts have NO access.
 */
export async function listStaffMembers(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: ListStaffInput,
): Promise<StaffMemberDetail[]> {
  if (actor.role === 'STAFF') {
    throw new StaffError('Staff accounts are not permitted to access staff records.', 403)
  }

  const whereClause: Prisma.UserWhereInput = {
    businessId: actor.businessId,
    deletedAt: null,
  }

  // If Manager, strictly lock query to their single assigned branch
  if (actor.role === 'MANAGER') {
    const managerAccess = await tx.branchAccess.findFirst({
      where: { userId: actor.userId },
      select: { branchId: true },
    })

    if (!managerAccess) {
      return []
    }

    whereClause.branchAccess = {
      some: { branchId: managerAccess.branchId },
    }
  } else if (actor.role === 'OWNER') {
    // Owner can optionally filter by branch; Owner is always included as business principal
    if (input.branchId && input.branchId.trim()) {
      whereClause.OR = [
        { role: 'OWNER' },
        { branchAccess: { some: { branchId: input.branchId.trim() } } },
      ]
    }
  }

  const users = await tx.user.findMany({
    where: whereClause,
    include: {
      branchAccess: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  })

  return users.map((u) => {
    const access = u.branchAccess[0]
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      branchId: access?.branchId ?? null,
      branchName: access?.branch?.name ?? (u.role === 'OWNER' ? 'All Branches' : null),
      isEmailVerified: !!u.emailVerifiedAt,
      isBanned: !!u.bannedAt,
    }
  })
}

/**
 * Adds a new Manager or Staff member to a branch.
 * Restricted to Owner only per Permission Matrix.
 */
export async function createStaffMember(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: CreateStaffMemberInput,
): Promise<StaffMemberDetail> {
  if (actor.role !== 'OWNER') {
    throw new StaffError('Only business owners are permitted to add team members.', 403)
  }

  if (input.role !== Role.MANAGER && input.role !== Role.STAFF) {
    throw new StaffError('Can only create MANAGER or STAFF accounts.')
  }

  if (!input.email || !input.email.includes('@')) {
    throw new StaffError('A valid email address is required.')
  }

  if (!input.password || input.password.length < 8) {
    throw new StaffError('Password must be at least 8 characters long.')
  }

  if (!input.branchId) {
    throw new StaffError('Staff members must be assigned to an active branch.')
  }

  // Verify branch belongs to this business
  const branch = await tx.branch.findFirst({
    where: { id: input.branchId, businessId: actor.businessId },
  })
  if (!branch) {
    throw new StaffError('Assigned branch does not exist in this business.', 400)
  }

  // Check unique email across system
  const existingUser = await tx.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
  })
  if (existingUser) {
    throw new StaffError('An account with this email address already exists.', 409)
  }

  const passwordHash = await hashPassword(input.password)

  // Create User and BranchAccess in same transaction
  const newUser = await tx.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: input.role,
      businessId: actor.businessId,
      emailVerifiedAt: new Date(), // Pre-verified by owner
      onboardingCompletedAt: new Date(), // Business already onboarded by owner
      branchAccess: {
        create: {
          branchId: input.branchId,
        },
      },
    },
    include: {
      branchAccess: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
  })

  // Write audit log
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: input.branchId,
    action: AuditAction.STAFF_CHANGED,
    resourceType: 'User',
    resourceId: newUser.id,
    newValue: {
      email: newUser.email,
      role: newUser.role,
      branchId: input.branchId,
    },
  })

  return {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    createdAt: newUser.createdAt,
    branchId: branch.id,
    branchName: branch.name,
    isEmailVerified: true,
    isBanned: false,
  }
}

/**
 * Updates a staff member's role or assigned branch.
 * Restricted to Owner only per Permission Matrix.
 */
export async function updateStaffMember(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: UpdateStaffMemberInput,
): Promise<StaffMemberDetail> {
  if (actor.role !== 'OWNER') {
    throw new StaffError('Only business owners can update staff roles or branch assignments.', 403)
  }

  const user = await tx.user.findFirst({
    where: { id: input.userId, businessId: actor.businessId },
    include: { branchAccess: true },
  })

  if (!user) {
    throw new StaffError('Staff member not found in this business.', 404)
  }

  if (user.role === Role.OWNER) {
    throw new StaffError('Owner accounts cannot be reassigned through this interface.', 400)
  }

  // 1. Update role if provided
  if (input.role && input.role !== user.role) {
    if (input.role !== Role.MANAGER && input.role !== Role.STAFF) {
      throw new StaffError('Invalid role assignment.')
    }

    await tx.user.update({
      where: { id: user.id },
      data: { role: input.role },
    })

    await writeAuditEntry(tx, {
      userId: actor.userId,
      actorEmail: actor.email,
      businessId: actor.businessId,
      branchId: user.branchAccess[0]?.branchId,
      action: AuditAction.ROLE_PERMISSION_CHANGED,
      resourceType: 'User',
      resourceId: user.id,
      previousValue: { role: user.role },
      newValue: { role: input.role },
    })
  }

  // 2. Update branch if provided
  if (input.branchId && input.branchId !== user.branchAccess[0]?.branchId) {
    const branch = await tx.branch.findFirst({
      where: { id: input.branchId, businessId: actor.businessId },
    })
    if (!branch) {
      throw new StaffError('Target branch does not exist.', 400)
    }

    // Replace branch access row (enforcing exactly one branch)
    await tx.branchAccess.deleteMany({
      where: { userId: user.id },
    })
    await tx.branchAccess.create({
      data: {
        userId: user.id,
        branchId: input.branchId,
      },
    })

    await writeAuditEntry(tx, {
      userId: actor.userId,
      actorEmail: actor.email,
      businessId: actor.businessId,
      branchId: input.branchId,
      action: AuditAction.STAFF_CHANGED,
      resourceType: 'BranchAccess',
      resourceId: user.id,
      previousValue: { branchId: user.branchAccess[0]?.branchId },
      newValue: { branchId: input.branchId },
    })
  }

  const updatedUser = await tx.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      branchAccess: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
  })

  const access = updatedUser.branchAccess[0]
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    createdAt: updatedUser.createdAt,
    branchId: access?.branchId ?? null,
    branchName: access?.branch?.name ?? null,
    isEmailVerified: !!updatedUser.emailVerifiedAt,
    isBanned: !!updatedUser.bannedAt,
  }
}

export interface DeleteStaffMemberInput {
  userId: string
}

/**
 * Deletes (removes) a Manager or Staff member from the business.
 * Strictly restricted to Business Owner per Permission Matrix.
 * Cannot delete an Owner account or self.
 * Revokes active sessions, deletes branchAccess, sets deletedAt (soft delete),
 * and records an audit log entry.
 */
export async function deleteStaffMember(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: DeleteStaffMemberInput,
): Promise<{ success: boolean; deletedUserId: string }> {
  if (actor.role !== 'OWNER') {
    throw new StaffError('Only business owners are permitted to remove team members.', 403)
  }

  const user = await tx.user.findFirst({
    where: { id: input.userId, businessId: actor.businessId, deletedAt: null },
    include: {
      branchAccess: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
  })

  if (!user) {
    throw new StaffError('Staff member not found in this business.', 404)
  }

  if (user.role === Role.OWNER) {
    throw new StaffError('Business Owner accounts cannot be deleted through the team roster.', 400)
  }

  if (user.id === actor.userId) {
    throw new StaffError('You cannot delete your own account from the team roster.', 400)
  }

  const branchName = user.branchAccess[0]?.branch?.name || null
  const branchId = user.branchAccess[0]?.branchId || null

  // 1. Revoke all active sessions immediately
  await tx.session.deleteMany({
    where: { userId: user.id },
  })

  // 2. Remove branch access
  await tx.branchAccess.deleteMany({
    where: { userId: user.id },
  })

  // 3. Soft-delete user row
  await tx.user.update({
    where: { id: user.id },
    data: {
      deletedAt: new Date(),
    },
  })

  // 4. Record audit log
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId,
    action: AuditAction.STAFF_CHANGED,
    resourceType: 'User',
    resourceId: user.id,
    previousValue: {
      email: user.email,
      role: user.role,
      branchId,
      branchName,
    },
    newValue: {
      status: 'DELETED',
      deletedAt: new Date().toISOString(),
    },
  })

  return { success: true, deletedUserId: user.id }
}

// ==========================================
// RECORD-ONLY PAYROLL TYPES & FUNCTIONS
// ==========================================

export interface PayrollRecordDetail {
  id: string
  userId: string | null
  userEmail: string
  userRole: string
  branchName: string
  payPeriod: string
  salaryAmount: number
  status: InvoiceStatus
  datePaid: Date | null
  createdAt: Date
}

export interface ListPayrollInput {
  businessId: string
  payPeriod?: string
  branchId?: string
  status?: InvoiceStatus
  page?: number
  pageSize?: number
}

export interface CreatePayrollInput {
  userId: string
  payPeriod: string
  salaryAmount: number
  status?: InvoiceStatus
  datePaid?: Date | null
}

export interface UpdatePayrollStatusInput {
  payrollId: string
  status: InvoiceStatus
  datePaid?: Date | null
}

/**
 * Lists payroll compensation records.
 * STRICTLY restricted to Owner accounts.
 * Managers and Staff are blocked with 403.
 */
export async function listPayrollRecords(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: ListPayrollInput,
): Promise<{
  records: PayrollRecordDetail[]
  totalCount: number
  totalAmount: number
  totalPaid: number
  totalUnpaid: number
  page: number
  pageSize: number
  totalPages: number
}> {
  if (actor.role !== 'OWNER') {
    throw new StaffError('Payroll compensation records are strictly confidential and restricted to the Business Owner.', 403)
  }

  const page = Math.max(1, input.page || 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20))
  const skip = (page - 1) * pageSize

  // User scope: only users within actor's business
  const whereClause: Prisma.PayrollEntryWhereInput = {
    user: { businessId: actor.businessId },
  }

  if (input.payPeriod && input.payPeriod.trim()) {
    whereClause.payPeriod = input.payPeriod.trim()
  }

  if (input.status) {
    whereClause.status = input.status
  }

  if (input.branchId && input.branchId.trim()) {
    whereClause.user = {
      businessId: actor.businessId,
      branchAccess: {
        some: { branchId: input.branchId.trim() },
      },
    }
  }

  const [totalCount, rows, allRecords] = await Promise.all([
    tx.payrollEntry.count({ where: whereClause }),
    tx.payrollEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            branchAccess: {
              include: { branch: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: [{ payPeriod: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    tx.payrollEntry.findMany({
      where: whereClause,
      select: { salaryAmount: true, status: true },
    }),
  ])

  let totalAmount = 0
  let totalPaid = 0
  let totalUnpaid = 0

  for (const r of allRecords) {
    const amt = Number(r.salaryAmount)
    totalAmount += amt
    if (r.status === InvoiceStatus.PAID) {
      totalPaid += amt
    } else {
      totalUnpaid += amt
    }
  }

  const records: PayrollRecordDetail[] = rows.map((r) => {
    const branchAccess = r.user?.branchAccess[0]
    return {
      id: r.id,
      userId: r.userId,
      userEmail: r.user?.email ?? 'Unknown User',
      userRole: r.user?.role ?? 'STAFF',
      branchName: branchAccess?.branch?.name ?? (r.user?.role === 'OWNER' ? 'All Branches' : 'Unassigned'),
      payPeriod: r.payPeriod,
      salaryAmount: Number(r.salaryAmount),
      status: r.status,
      datePaid: r.datePaid,
      createdAt: r.createdAt,
    }
  })

  return {
    records,
    totalCount,
    totalAmount,
    totalPaid,
    totalUnpaid,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

/**
 * Creates a record-only payroll entry.
 * STRICTLY restricted to Owner accounts.
 */
export async function createPayrollRecord(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: CreatePayrollInput,
): Promise<PayrollRecordDetail> {
  if (actor.role !== 'OWNER') {
    throw new StaffError('Only business owners can create payroll compensation records.', 403)
  }

  if (input.salaryAmount <= 0) {
    throw new StaffError('Salary amount must be greater than zero.')
  }

  if (!input.payPeriod || !input.payPeriod.trim()) {
    throw new StaffError('Pay period (e.g. 2026-11) is required.')
  }

  // Validate target user belongs to this business
  const user = await tx.user.findFirst({
    where: { id: input.userId, businessId: actor.businessId },
    include: {
      branchAccess: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
  })

  if (!user) {
    throw new StaffError('Selected staff member was not found in your business.', 404)
  }

  const status = input.status || InvoiceStatus.UNPAID
  const datePaid = status === InvoiceStatus.PAID ? (input.datePaid || new Date()) : null

  const record = await tx.payrollEntry.create({
    data: {
      userId: user.id,
      payPeriod: input.payPeriod.trim(),
      salaryAmount: new Prisma.Decimal(input.salaryAmount),
      status,
      datePaid,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          branchAccess: {
            include: { branch: { select: { name: true } } },
          },
        },
      },
    },
  })

  // Write audit log
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: user.branchAccess[0]?.branchId,
    action: AuditAction.PAYROLL_RECORD_CREATED,
    resourceType: 'PayrollEntry',
    resourceId: record.id,
    newValue: {
      userId: user.id,
      payPeriod: record.payPeriod,
      salaryAmount: input.salaryAmount,
      status: record.status,
    },
  })

  const branchAccess = record.user?.branchAccess[0]
  return {
    id: record.id,
    userId: record.userId,
    userEmail: record.user?.email ?? user.email,
    userRole: record.user?.role ?? user.role,
    branchName: branchAccess?.branch?.name ?? (user.role === 'OWNER' ? 'All Branches' : 'Unassigned'),
    payPeriod: record.payPeriod,
    salaryAmount: Number(record.salaryAmount),
    status: record.status,
    datePaid: record.datePaid,
    createdAt: record.createdAt,
  }
}

/**
 * Updates a payroll record's payment status (e.g. marking as PAID or UNPAID).
 * STRICTLY restricted to Owner accounts.
 */
export async function updatePayrollStatus(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: UpdatePayrollStatusInput,
): Promise<PayrollRecordDetail> {
  if (actor.role !== 'OWNER') {
    throw new StaffError('Only business owners can update payroll records.', 403)
  }

  const record = await tx.payrollEntry.findUnique({
    where: { id: input.payrollId },
    include: {
      user: {
        include: {
          branchAccess: {
            include: { branch: { select: { name: true } } },
          },
        },
      },
    },
  })

  if (!record || record.user?.businessId !== actor.businessId) {
    throw new StaffError('Payroll record not found.', 404)
  }

  const datePaid = input.status === InvoiceStatus.PAID ? (input.datePaid || new Date()) : null

  const updated = await tx.payrollEntry.update({
    where: { id: record.id },
    data: {
      status: input.status,
      datePaid,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          branchAccess: {
            include: { branch: { select: { name: true } } },
          },
        },
      },
    },
  })

  // Write audit log
  await writeAuditEntry(tx, {
    userId: actor.userId,
    actorEmail: actor.email,
    businessId: actor.businessId,
    branchId: updated.user?.branchAccess[0]?.branchId,
    action: AuditAction.PAYROLL_RECORD_UPDATED,
    resourceType: 'PayrollEntry',
    resourceId: updated.id,
    previousValue: { status: record.status, datePaid: record.datePaid },
    newValue: { status: updated.status, datePaid: updated.datePaid },
  })

  const branchAccess = updated.user?.branchAccess[0]
  return {
    id: updated.id,
    userId: updated.userId,
    userEmail: updated.user?.email ?? 'Unknown User',
    userRole: updated.user?.role ?? 'STAFF',
    branchName: branchAccess?.branch?.name ?? (updated.user?.role === 'OWNER' ? 'All Branches' : 'Unassigned'),
    payPeriod: updated.payPeriod,
    salaryAmount: Number(updated.salaryAmount),
    status: updated.status,
    datePaid: updated.datePaid,
    createdAt: updated.createdAt,
  }
}

