import { getSessionUser } from '@/lib/auth'
import { withRls, toRlsRole } from '@/lib/rls'
import type { AuthUser } from '@/lib/auth-api'

/**
 * Builds the client-facing view of the signed in user.
 *
 * The same function feeds the `/api/auth/me` route and the server side cache
 * seed, so a hydrated client and a refetched client always agree on the shape.
 */
export async function readCurrentUser(): Promise<AuthUser | null> {
  const user = await getSessionUser()
  if (!user) return null

  const business = await withRls(
    {
      role: toRlsRole(user.role),
      businessId: user.businessId,
      userId: user.id,
    },
    (tx) =>
      tx.business.findUnique({
        where: { id: user.businessId },
        select: { name: true },
      }),
  )

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    businessName: business?.name ?? null,
    emailVerified: user.emailVerifiedAt !== null,
  }
}
