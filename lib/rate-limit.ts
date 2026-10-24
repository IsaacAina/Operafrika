import { NextResponse } from 'next/server'

export const MAX_FAILED_ATTEMPTS = 5
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10000

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

export function normalizeIdentityEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Reads the submitted email from a copy of the request so the handler can
 * still read the original body. Returns null when the body carries no email,
 * which leaves the caller with the IP bucket alone.
 */
async function readIdentityEmail(req: Request): Promise<string | null> {
  try {
    const body = await req.clone().json()
    const email = (body as { email?: unknown } | null)?.email
    if (typeof email !== 'string') return null
    const normalized = normalizeIdentityEmail(email)
    return normalized.length > 0 ? normalized : null
  } catch {
    return null
  }
}

function retryAfterSeconds(key: string): number | null {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) return null
  if (bucket.count < MAX_FAILED_ATTEMPTS) return null
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
}

function recordFailedAttempt(key: string) {
  const now = Date.now()
  if (buckets.size >= MAX_BUCKETS) pruneExpired(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS })
    return
  }
  bucket.count += 1
}

function clearAttempts(key: string) {
  buckets.delete(key)
}

export function tooManyAttempts(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many failed attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

type GuardOptions = {
  countAllAttempts?: boolean
  /**
   * Also count attempts against the submitted email address, in a bucket
   * separate from the caller's IP. The IP bucket stops one source spraying
   * many accounts; the email bucket stops one account being sprayed from many
   * sources. Both must stay under the limit for a request to proceed.
   */
  bucketByEmail?: boolean
}

export async function guard(
  req: Request,
  scope: string,
  handler: () => Promise<NextResponse>,
  options?: GuardOptions,
): Promise<NextResponse> {
  const ip = getClientIp(req)
  const email = options?.bucketByEmail ? await readIdentityEmail(req) : null

  const keys = [`${scope}:ip:${ip}`]
  if (email) keys.push(`${scope}:email:${email}`)

  let retryAfter: number | null = null
  for (const key of keys) {
    const seconds = retryAfterSeconds(key)
    if (seconds !== null && (retryAfter === null || seconds > retryAfter)) {
      retryAfter = seconds
    }
  }
  if (retryAfter !== null) return tooManyAttempts(retryAfter)

  let response: NextResponse
  try {
    response = await handler()
  } catch (error) {
    console.error(`${scope} error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (response.status >= 500) return response

  if (options?.countAllAttempts) {
    for (const key of keys) recordFailedAttempt(key)
    return response
  }

  if (response.status >= 400) {
    for (const key of keys) recordFailedAttempt(key)
  } else {
    for (const key of keys) clearAttempts(key)
  }

  return response
}
