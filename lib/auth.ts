import { cookies } from 'next/headers'
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionRecord,
  deleteSessionRecord,
  resolveSessionFromToken,
  revokeAllSessions,
  toSessionPayload,
  type SessionPayload,
  type SessionUser,
} from '@/lib/session'

export type { SessionPayload, SessionUser }
export { revokeAllSessions }

/**
 * Creates a new DB-backed session. The raw token goes only into the httpOnly
 * cookie; only its SHA-256 hash is written to the database.
 */
export async function createSession(payload: SessionPayload) {
  const { token, expiresAt } = await createSessionRecord(payload.userId)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

/**
 * Validates the session cookie: hashes the token, looks it up in the database,
 * confirms the user still exists and is not banned or locked, and reaps the
 * session if it has expired.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await resolveSessionFromToken(token)
    if (!user) return null
    return toSessionPayload(user)
  } catch {
    return null
  }
}

/**
 * Loads the full user record behind the current session, or null when there
 * is no valid session or the user is banned or locked.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    return await resolveSessionFromToken(token)
  } catch {
    return null
  }
}

export type ClearSessionResult = {
  /** The browser cookie was cleared. */
  cookieCleared: true
  /** The server-side session row was deleted. */
  sessionDeleted: boolean
}

/**
 * Ends the current session.
 *
 * The cookie is cleared first and unconditionally, so a user who asks to sign
 * out is always signed out in the browser. A failure to delete the session
 * row is reported rather than swallowed, because the token would still be a
 * live server-side session and must not be treated as revoked.
 */
export async function clearSession(): Promise<ClearSessionResult> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  cookieStore.delete(SESSION_COOKIE_NAME)

  if (!token) return { cookieCleared: true, sessionDeleted: true }

  try {
    await deleteSessionRecord(token)
    return { cookieCleared: true, sessionDeleted: true }
  } catch (error) {
    console.error('Logout could not revoke the server-side session:', error)
    return { cookieCleared: true, sessionDeleted: false }
  }
}
