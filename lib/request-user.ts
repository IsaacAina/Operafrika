import { getSession } from '@/lib/auth'
import type { SessionPayload } from '@/lib/session'

/**
 * Resolves the signed in user from the server side session.
 *
 * Proxy headers are display hints only and are never trusted for a branch or
 * role decision here. Every caller gets the session read back from the
 * database, which is the authorization source of truth.
 */
export async function getRequestUser(): Promise<SessionPayload | null> {
  return await getSession()
}
