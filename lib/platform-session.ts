import { randomBytes } from 'crypto'
import { prisma } from './db'
import { hashToken } from '@/lib/token-hash'

export const PLATFORM_SESSION_COOKIE_NAME = 'operafrika_platform_session'
export const PLATFORM_SESSION_TTL_DAYS = 7
export const PLATFORM_SESSION_TTL_MS = PLATFORM_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

export interface PlatformSessionPayload {
  platformUserId: string
  email: string
  canAccessAdminConsole: boolean
  canAccessFounderDashboard: boolean
}

export interface PlatformSessionUser {
  id: string
  email: string
  canAccessAdminConsole: boolean
  canAccessFounderDashboard: boolean
}

export function hashPlatformSessionToken(token: string): string {
  return hashToken(token)
}

export function generatePlatformSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export async function resolvePlatformSessionFromToken(
  token: string | undefined | null,
): Promise<PlatformSessionUser | null> {
  if (!token) return null

  const tokenHash = hashToken(token)

  const session = await prisma.platformSession.findUnique({ where: { tokenHash } })
  if (!session) return null

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.platformSession
      .delete({ where: { id: session.id } })
      .catch(() => undefined)
    return null
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { id: session.platformUserId },
    select: {
      id: true,
      email: true,
      canAccessAdminConsole: true,
      canAccessFounderDashboard: true,
    },
  })
  if (!platformUser) return null

  return platformUser
}

export async function createPlatformSessionRecord(platformUserId: string): Promise<{
  token: string
  expiresAt: Date
}> {
  const token = generatePlatformSessionToken()
  const expiresAt = new Date(Date.now() + PLATFORM_SESSION_TTL_MS)

  await prisma.platformSession.create({
    data: { platformUserId, tokenHash: hashToken(token), expiresAt },
  })

  await prisma.platformSession
    .deleteMany({ where: { platformUserId, expiresAt: { lte: new Date() } } })
    .catch(() => undefined)

  return { token, expiresAt }
}

export async function deletePlatformSessionRecord(token: string): Promise<void> {
  await prisma.platformSession.deleteMany({ where: { tokenHash: hashToken(token) } })
}

export function toPlatformSessionPayload(user: PlatformSessionUser): PlatformSessionPayload {
  return {
    platformUserId: user.id,
    email: user.email,
    canAccessAdminConsole: user.canAccessAdminConsole,
    canAccessFounderDashboard: user.canAccessFounderDashboard,
  }
}
