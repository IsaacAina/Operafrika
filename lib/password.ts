import argon2 from 'argon2'
import bcrypt from 'bcryptjs'

const ARGON2_PREFIX = '$argon2'

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password)
}

export function isLegacyBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    if (hash.startsWith(ARGON2_PREFIX)) {
      return await argon2.verify(hash, password)
    }
    if (isLegacyBcryptHash(hash)) {
      return await bcrypt.compare(password, hash)
    }
    return false
  } catch {
    return false
  }
}
