import { createHash } from 'crypto'

/**
 * SHA-256 of a secret token.
 *
 * Only the hash is stored, so a leaked database table cannot be replayed as a
 * live session, a password reset link, or an email verification code.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
