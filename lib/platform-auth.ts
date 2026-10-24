import { cookies } from 'next/headers'
import {
  PLATFORM_SESSION_COOKIE_NAME,
  PLATFORM_SESSION_TTL_DAYS,
  createPlatformSessionRecord,
  deletePlatformSessionRecord,
  resolvePlatformSessionFromToken,
  toPlatformSessionPayload,
  type PlatformSessionPayload,
  type PlatformSessionUser,
} from '@/lib/platform-session'

export type { PlatformSessionPayload, PlatformSessionUser }
export { resolvePlatformSessionFromToken }

export async function createPlatformSession(payload: Pick<PlatformSessionUser, 'id'>) {
  const { token, expiresAt } = await createPlatformSessionRecord(payload.id)

  const cookieStore = await cookies()
  cookieStore.set(PLATFORM_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    maxAge: PLATFORM_SESSION_TTL_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export async function getPlatformSession(): Promise<PlatformSessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(PLATFORM_SESSION_COOKIE_NAME)?.value
    const user = await resolvePlatformSessionFromToken(token)
    if (!user) return null
    return toPlatformSessionPayload(user)
  } catch {
    return null
  }
}

export async function getPlatformSessionUser(): Promise<PlatformSessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(PLATFORM_SESSION_COOKIE_NAME)?.value
    return await resolvePlatformSessionFromToken(token)
  } catch {
    return null
  }
}

export async function clearPlatformSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE_NAME)?.value
  cookieStore.delete(PLATFORM_SESSION_COOKIE_NAME)
  if (token) {
    await deletePlatformSessionRecord(token).catch(() => undefined)
  }
}
