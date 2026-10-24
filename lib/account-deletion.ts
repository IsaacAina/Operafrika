import { randomBytes } from 'crypto'
import { AuditAction, Role } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit-log'
import { hashToken } from '@/lib/token-hash'

/**
 * Account deletion runs in three steps:
 *
 *  1. Soft delete. The account is closed immediately and every session is
 *     revoked, but the rows stay in the database.
 *  2. Grace period. The owner has a window to change their mind. The
 *     deadline is stored on the row so a missed job run cannot lose it.
 *  3. Hard delete. A scheduled job purges the rows once the deadline passes.
 *
 * The grace period defaults to 30 days and is configurable through
 * ACCOUNT_DELETION_GRACE_DAYS.
 */
export const DEFAULT_GRACE_PERIOD_DAYS = 30

/** How long the cancellation link stays usable. It matches the grace period:
 * once the deadline passes the account is purged and there is nothing left to
 * cancel. */
export const CANCEL_TOKEN_TTL_DAYS = DEFAULT_GRACE_PERIOD_DAYS

/** Audit actions that describe the deletion itself. They are kept when a
 * business is purged, because they are the record of what was erased. */
export const ACCOUNT_DELETION_ACTIONS: AuditAction[] = [
  AuditAction.ACCOUNT_DELETION_SCHEDULED,
  AuditAction.ACCOUNT_DELETION_CANCELLED,
  AuditAction.ACCOUNT_DELETION_PURGED,
]

export class AccountDeletionError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AccountDeletionError'
    this.status = status
  }
}

export function getGracePeriodDays(): number {
  const raw = process.env.ACCOUNT_DELETION_GRACE_DAYS
  if (!raw) return DEFAULT_GRACE_PERIOD_DAYS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_GRACE_PERIOD_DAYS
  return parsed
}

export function getGracePeriodEnd(from: Date = new Date()): Date {
  return new Date(from.getTime() + getGracePeriodDays() * 24 * 60 * 60 * 1000)
}

export interface AccountDeletionOutcome {
  userId: string
  businessId: string
  businessName: string
  email: string
  scheduledFor: Date
  gracePeriodDays: number
  /** The raw cancellation token. It exists only in this return value and in
   * the email sent to the owner. Only its hash is stored. */
  cancelToken: string
  /** Set when the business is scheduled for deletion too, because this
   * account is the last owner of it. */
  businessScheduledFor: Date | null
}

/**
 * Closes an account and schedules it for purge.
 *
 * The account stops working immediately: sessions are revoked and the sign in
 * route refuses it. The rows are removed later by the scheduled job.
 *
 * When the account is the last owner of its business, the business is
 * scheduled for deletion in the same window. A business with no owner cannot
 * be administered, so leaving it behind would strand the data.
 */
export async function requestAccountDeletion(
  userId: string,
): Promise<AccountDeletionOutcome> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      businessId: true,
      deletedAt: true,
      business: { select: { name: true } },
    },
  })

  if (!user) {
    throw new AccountDeletionError('Account not found.', 404)
  }
  if (user.deletedAt) {
    throw new AccountDeletionError(
      'This account is already scheduled for deletion.',
      409,
    )
  }

  const otherActiveOwners = await prisma.user.count({
    where: {
      businessId: user.businessId,
      role: Role.OWNER,
      deletedAt: null,
      id: { not: user.id },
    },
  })
  const isLastOwner = user.role === Role.OWNER && otherActiveOwners === 0

  const now = new Date()
  const gracePeriodDays = getGracePeriodDays()
  const scheduledFor = getGracePeriodEnd(now)
  const cancelToken = randomBytes(32).toString('hex')
  // The link is valid for exactly the grace period, so it cannot lapse while
  // the account can still be saved, and cannot outlive the account.
  const cancelTokenExpires = scheduledFor

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: now,
        deletionScheduledFor: scheduledFor,
        deletionCancelTokenHash: hashToken(cancelToken),
        deletionCancelTokenExpires: cancelTokenExpires,
      },
    })

    // The account is closed now, so every session goes with it.
    await tx.session.deleteMany({ where: { userId: user.id } })

    if (isLastOwner) {
      await tx.business.update({
        where: { id: user.businessId },
        data: { deletedAt: now, deletionScheduledFor: scheduledFor },
      })
    }

    await writeAuditEntry(tx, {
      userId: user.id,
      actorEmail: user.email,
      businessId: user.businessId,
      action: AuditAction.ACCOUNT_DELETION_SCHEDULED,
      resourceType: 'User',
      resourceId: user.id,
      newValue: {
        deletedAt: now.toISOString(),
        deletionScheduledFor: scheduledFor.toISOString(),
        gracePeriodDays,
      },
      metadata: {
        businessScheduledForDeletion: isLastOwner,
        businessScheduledFor: isLastOwner ? scheduledFor.toISOString() : null,
      },
    })
  })

  return {
    userId: user.id,
    businessId: user.businessId,
    businessName: user.business.name,
    email: user.email,
    scheduledFor,
    gracePeriodDays,
    cancelToken,
    businessScheduledFor: isLastOwner ? scheduledFor : null,
  }
}

export interface AccountDeletionCancellation {
  userId: string
  email: string
  businessId: string
}

/**
 * Cancels a scheduled deletion during the grace period.
 *
 * The raw token is compared against the hash stored on the account. The token
 * is single use: cancelling clears it.
 */
export async function cancelAccountDeletion(
  rawToken: string,
): Promise<AccountDeletionCancellation | null> {
  if (!rawToken) return null

  const tokenHash = hashToken(rawToken)
  const candidates = await prisma.user.findMany({
    where: { deletionCancelTokenHash: tokenHash },
    select: {
      id: true,
      email: true,
      businessId: true,
      deletedAt: true,
      deletionCancelTokenExpires: true,
    },
  })

  const now = new Date()
  const user = candidates.find(
    (candidate) =>
      candidate.deletedAt !== null &&
      candidate.deletionCancelTokenExpires !== null &&
      candidate.deletionCancelTokenExpires.getTime() > now.getTime(),
  )
  if (!user) return null

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        deletionScheduledFor: null,
        deletionCancelTokenHash: null,
        deletionCancelTokenExpires: null,
      },
    })

    // The business was scheduled because this account was its last owner.
    // Now that an owner is active again, the business stays.
    const activeOwners = await tx.user.count({
      where: {
        businessId: user.businessId,
        role: Role.OWNER,
        deletedAt: null,
      },
    })
    if (activeOwners > 0) {
      await tx.business.updateMany({
        where: { id: user.businessId, deletedAt: { not: null } },
        data: { deletedAt: null, deletionScheduledFor: null },
      })
    }

    await writeAuditEntry(tx, {
      userId: user.id,
      actorEmail: user.email,
      businessId: user.businessId,
      action: AuditAction.ACCOUNT_DELETION_CANCELLED,
      resourceType: 'User',
      resourceId: user.id,
      newValue: { deletedAt: null, deletionScheduledFor: null },
    })
  })

  return { userId: user.id, email: user.email, businessId: user.businessId }
}

export interface PurgeReport {
  purgedUsers: number
  purgedBusinesses: number
  failures: Array<{ scope: 'user' | 'business'; id: string; error: string }>
}

/**
 * Purges every account and business whose grace period has ended.
 *
 * Businesses are purged first, because purging a business also purges the
 * accounts that belong to it. One failure does not stop the run: it is
 * reported and the other records are still processed.
 */
export async function purgeExpiredAccountDeletions(
  now: Date = new Date(),
): Promise<PurgeReport> {
  const report: PurgeReport = {
    purgedUsers: 0,
    purgedBusinesses: 0,
    failures: [],
  }

  const businesses = await prisma.business.findMany({
    where: { deletedAt: { not: null }, deletionScheduledFor: { lte: now } },
    select: { id: true },
  })

  for (const business of businesses) {
    try {
      await purgeBusiness(business.id, now)
      report.purgedBusinesses += 1
    } catch (error) {
      report.failures.push({
        scope: 'business',
        id: business.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: { not: null },
      deletionScheduledFor: { lte: now },
      // Accounts that belong to a business which is also scheduled are left
      // to the business purge. Purging them on their own would leave a
      // business without its owner if the business purge then fails.
      business: { deletedAt: null },
    },
    select: { id: true },
  })

  for (const user of users) {
    try {
      await purgeUser(user.id, now)
      report.purgedUsers += 1
    } catch (error) {
      report.failures.push({
        scope: 'user',
        id: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return report
}

/**
 * Removes one account.
 *
 * Personal rows go with it: sessions, branch access, verification codes,
 * password reset tokens and support messages. Business records stay, because
 * they belong to the business rather than to the person: audit entries and
 * payroll entries keep their content and only lose the link to the account.
 */
async function purgeUser(userId: string, now: Date): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, businessId: true },
  })
  if (!user) return

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.updateMany({
      where: { userId: user.id },
      data: { userId: null, actorEmail: user.email },
    })
    await tx.payrollEntry.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    })
    await tx.user.delete({ where: { id: user.id } })
  })
}

/**
 * Removes a business and everything inside it.
 *
 * Rows are removed in dependency order, because the schema keeps the
 * references between them. The audit entries that describe the deletion
 * itself are kept: they are the record of what was erased.
 */
async function purgeBusiness(businessId: string, now: Date): Promise<void> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true },
  })
  if (!business) return

  const branches = await prisma.branch.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const branchIds = branches.map((branch) => branch.id)

  const users = await prisma.user.findMany({
    where: { businessId: business.id },
    select: { id: true, email: true },
  })
  const userIds = users.map((user) => user.id)

  const invoices = await prisma.invoice.findMany({
    where: { branchId: { in: branchIds } },
    select: { id: true },
  })
  const invoiceIds = invoices.map((invoice) => invoice.id)

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId: null,
        actorEmail: null,
        businessId: business.id,
        action: AuditAction.ACCOUNT_DELETION_PURGED,
        resourceType: 'Business',
        resourceId: business.id,
        newValue: {
          purgedAt: now.toISOString(),
          businessName: business.name,
          branches: branchIds.length,
          accounts: userIds.length,
          invoices: invoiceIds.length,
        },
      },
    })

    await tx.invoiceItem.deleteMany({
      where: {
        OR: [
          { invoiceId: { in: invoiceIds } },
          { stockItem: { branchId: { in: branchIds } } },
        ],
      },
    })
    await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } })
    await tx.incomeEntry.deleteMany({ where: { branchId: { in: branchIds } } })
    await tx.expenseEntry.deleteMany({ where: { branchId: { in: branchIds } } })
    await tx.stockMovement.deleteMany({
      where: { stockItem: { branchId: { in: branchIds } } },
    })
    await tx.stockItem.deleteMany({ where: { branchId: { in: branchIds } } })
    await tx.customer.deleteMany({ where: { branchId: { in: branchIds } } })

    // Branch access points at a branch, so it goes before the branch does.
    await tx.branchAccess.deleteMany({ where: { userId: { in: userIds } } })
    await tx.branch.deleteMany({ where: { id: { in: branchIds } } })

    await tx.payrollEntry.deleteMany({ where: { userId: { in: userIds } } })
    await tx.supportMessage.deleteMany({ where: { userId: { in: userIds } } })
    await tx.auditLog.deleteMany({
      where: {
        businessId: business.id,
        action: { notIn: ACCOUNT_DELETION_ACTIONS },
      },
    })

    await tx.session.deleteMany({ where: { userId: { in: userIds } } })
    await tx.emailVerificationCode.deleteMany({
      where: { userId: { in: userIds } },
    })
    await tx.passwordResetToken.deleteMany({
      where: { userId: { in: userIds } },
    })
    await tx.user.deleteMany({ where: { id: { in: userIds } } })

    await tx.subscription.deleteMany({ where: { businessId: business.id } })
    await tx.business.delete({ where: { id: business.id } })
  })
}
