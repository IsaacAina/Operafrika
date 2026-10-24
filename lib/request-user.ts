import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { REQUEST_USER_HEADERS, type SessionPayload } from '@/lib/session'

/**
 * Reads the user that the proxy attached to this request.
 *
 * Use this for display and for knowing who is signed in. It is not an
 * authorization check: the attached headers are only trustworthy because the
 * proxy overwrites them on every request it matches. For any decision about
 * what a user may read or change, resolve the session from the database with
 * getSession() inside the route handler or data access function.
 */
export async function getRequestUser(): Promise<SessionPayload | null> {
  try {
    const requestHeaders = await headers()
    const userId = requestHeaders.get(REQUEST_USER_HEADERS.userId)

    if (userId) {
      const businessId = requestHeaders.get(REQUEST_USER_HEADERS.businessId)
      const role = requestHeaders.get(REQUEST_USER_HEADERS.role)
      const email = requestHeaders.get(REQUEST_USER_HEADERS.email)
      if (businessId && role && email) {
        return {
          userId,
          businessId,
          role,
          email,
          emailVerified:
            requestHeaders.get(REQUEST_USER_HEADERS.emailVerified) === 'true',
        }
      }
    }

    // The proxy did not match this request, so resolve it directly.
    return await getSession()
  } catch {
    return null
  }
}
