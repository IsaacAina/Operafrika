import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { hashToken } from '@/lib/token-hash'

export const SESSION_COOKIE_NAME = 'operafrika_session'
export const SESSION_TTL_DAYS = 7
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

/**
 * Request headers the proxy attaches the resolved user to, so server
 * components know who is signed in without repeating the session lookup.
 * The proxy overwrites these on every matched request, so a client cannot
 * spoof them.
 */
export const REQUEST_USER_HEADERS = {
  userId: 'x-operafrika-user-id',
  businessId: 'x-operafrika-business-id',
  role: 'x-operafrika-role',
  email: 'x-operafrika-email',
  emailVerified: 'x-operafrika-email-verified',
} as const

export interface SessionPayload {
  userId: string
  businessId: string
  role: string
  email: string
  emailVerified: boolean
}

export interface SessionUser {
  id: string
  email: string
  role: string
  businessId: string
  emailVerifiedAt: Date | null
  bannedAt: Date | null
  lockedUntil: Date | null
  deletedAt: Date | null
}

/**
 * Only the hash of a session token is ever written to the database. A leaked
 * table therefore cannot be replayed as a live session.
 */
export function hashSessionToken(token: string): string {
  return hashToken(token)
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function isUserLocked(
  user: Pick<SessionUser, 'bannedAt' | 'lockedUntil'>,
  now: Date = new Date(),
): boolean {
  if (user.bannedAt) return true
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) return true
  return false
}

export function toSessionPayload(user: SessionUser): SessionPayload {
  return {
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
  }
}

/**
 * Resolves a raw cookie token to the user it belongs to. Returns null when
 * the session is unknown, expired, or the user is banned, locked, or inside
 * its account deletion grace period.
 */
export async function resolveSessionFromToken(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null

  const tokenHash = hashToken(token)

  const session = await prisma.session.findUnique({ where: { tokenHash } })
  if (!session) return null

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined)
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      businessId: true,
      emailVerifiedAt: true,
      bannedAt: true,
      lockedUntil: true,
      deletedAt: true,
    },
  })
  if (!user) return null

  if (isUserLocked(user)) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined)
    return null
  }

  // An account that is scheduled for deletion has no session.
  if (user.deletedAt) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined)
    return null
  }

  return user
}

/**
 * Creates the database half of a session and returns the raw token. The raw
 * token is never stored, only its hash.
 */
export async function createSessionRecord(userId: string): Promise<{
  token: string
  expiresAt: Date
}> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  })

  // Expired rows are only reaped when someone presents them, so clear this
  // user's leftovers whenever a new session starts.
  await prisma.session
    .deleteMany({ where: { userId, expiresAt: { lte: new Date() } } })
    .catch(() => undefined)

  return { token, expiresAt }
}

/**
 * Deletes the session behind a raw token. Errors are not swallowed: the
 * caller has to know when the server-side session survived a logout.
 */
export async function deleteSessionRecord(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
}

type SessionClient = {
  session: {
    deleteMany(args: { where: { userId: string } }): Promise<unknown>
  }
}

/**
 * Revokes every session a user holds. Pass a transaction client to make the
 * revocation part of a larger transaction.
 */
export async function revokeAllSessions(
  userId: string,
  client: SessionClient = prisma,
): Promise<void> {
  await client.session.deleteMany({ where: { userId } })
}

/**
 * Only same-app relative paths are accepted as a post-login redirect target.
 * Anything else would be an open redirect to another site.
 */
export function resolveSafeRedirect(
  next: string | null | undefined,
): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//')) return null
  if (next.includes('\\')) return null
  if (/[\r\n]/.test(next)) return null
  if (next !== '/app' && !next.startsWith('/app/') && !next.startsWith('/app?') && !next.startsWith('/app#')) {
    return null
  }
  return next
}
