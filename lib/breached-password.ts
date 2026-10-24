import { createHash } from 'crypto'

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range'
const HIBP_TIMEOUT_MS = 10000

export const BREACHED_PASSWORD_ERROR =
  'This password has appeared in a known data breach. Please choose a different password.'

function sha1Upper(value: string): string {
  return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase()
}

export async function breachedPasswordCount(
  password: string,
): Promise<number | null> {
  if (!password) return 0

  const hash = sha1Upper(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS)

  try {
    const res = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'Operafrika-Password-Check',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(`HIBP lookup failed with status ${res.status}`)
      return null
    }

    const body = await res.text()
    for (const line of body.split('\n')) {
      const separator = line.indexOf(':')
      if (separator === -1) continue
      const candidate = line.slice(0, separator).trim()
      if (candidate !== suffix) continue
      const count = Number.parseInt(line.slice(separator + 1).trim(), 10)
      return Number.isNaN(count) ? null : count
    }

    return 0
  } catch (error) {
    console.error('HIBP lookup error:', error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function isBreachedPassword(password: string): Promise<boolean> {
  const count = await breachedPasswordCount(password)
  return typeof count === 'number' && count > 0
}
