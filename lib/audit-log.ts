import { Prisma, AuditAction } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * The subset of a Prisma client this module needs. Accepts both the top level
 * client and a transaction client, so an audit entry can be written inside the
 * same transaction as the action it records.
 */
type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>

export interface AuditEntry {
  /** The acting account. Null for actions taken by the system itself. */
  userId: string | null
  /** Snapshot of the actor's email, so the entry still names someone after
   * the account row is gone. */
  actorEmail?: string | null
  businessId: string
  branchId?: string | null
  action: AuditAction
  resourceType: string
  resourceId: string
  previousValue?: Prisma.InputJsonValue | undefined
  newValue?: Prisma.InputJsonValue | undefined
  metadata?: Prisma.InputJsonValue | undefined
}

/**
 * Writes one audit entry.
 *
 * Audit entries are never best effort. Call this inside the transaction that
 * performs the action: if the entry cannot be written, the transaction rolls
 * back and the action never happened.
 */
export async function writeAuditEntry(
  client: AuditClient,
  entry: AuditEntry,
): Promise<void> {
  await client.auditLog.create({
    data: {
      userId: entry.userId,
      actorEmail: entry.actorEmail ?? null,
      businessId: entry.businessId,
      branchId: entry.branchId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      metadata: entry.metadata,
    },
  })
}

/** Writes an audit entry outside of any caller owned transaction. */
export async function writeAuditEntryNow(entry: AuditEntry): Promise<void> {
  await writeAuditEntry(prisma, entry)
}
