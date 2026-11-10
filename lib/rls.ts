import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export type RlsRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'SYSTEM'

export interface RlsContext {
  role: RlsRole
  businessId?: string | null
  branchId?: string | null
  userId?: string | null
}

let roleCheck: Promise<void> | null = null

async function assertDatabaseRoleIsRlsSafe(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return

  const rows = await prisma.$queryRaw<
    Array<{ is_super: boolean; bypasses_rls: boolean }>
  >`select rolsuper as is_super, rolbypassrls as bypasses_rls
      from pg_roles
     where rolname = current_user`

  const role = rows[0]
  if (role?.is_super || role?.bypasses_rls) {
    throw new Error(
      'DATABASE_URL must use a non-superuser PostgreSQL role without BYPASSRLS. Row Level Security is not enforced for superusers.',
    )
  }
}

async function ensureSafeDatabaseRole(): Promise<void> {
  if (!roleCheck) {
    roleCheck = assertDatabaseRoleIsRlsSafe().catch((error) => {
      roleCheck = null
      throw error
    })
  }
  await roleCheck
}

/**
 * Runs a callback inside a transaction with the PostgreSQL RLS settings that
 * the policies in prisma/migrations expect.
 *
 * Every business data read or write must go through this helper or through a
 * transaction client it produced. The settings are transaction local, so they
 * cannot leak to another request when the connection returns to the pool.
 */
export async function withRls<T>(
  context: RlsContext,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  await ensureSafeDatabaseRole()

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`select set_config('app.role', ${context.role}, true)`
    await tx.$queryRaw`select set_config('app.business_id', ${context.businessId ?? ''}, true)`
    await tx.$queryRaw`select set_config('app.branch_id', ${context.branchId ?? ''}, true)`
    await tx.$queryRaw`select set_config('app.user_id', ${context.userId ?? ''}, true)`

    return run(tx)
  })
}

/**
 * System context for authentication, session resolution, onboarding setup and
 * scheduled maintenance. Never use this for a request that only needs to read
 * or change one business's data.
 */
export async function withSystemRls<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withRls({ role: 'SYSTEM' }, run)
}

export function toRlsRole(role: string): RlsRole {
  if (role === 'OWNER' || role === 'MANAGER' || role === 'STAFF') return role
  throw new Error(`Unknown role for RLS context: ${role}`)
}
