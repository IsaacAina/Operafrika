import { NextResponse, type NextRequest } from 'next/server'
import {
  REQUEST_USER_HEADERS,
  SESSION_COOKIE_NAME,
  resolveSafeRedirect,
  resolveSessionFromToken,
  toSessionPayload,
} from '@/lib/session'
import {
  PLATFORM_SESSION_COOKIE_NAME,
  resolvePlatformSessionFromToken,
} from '@/lib/platform-session'

/**
 * Proxy runs on the Node.js runtime in Next.js 16, so the session lookup hits
 * the same database as the rest of the app.
 *
 * This is the first gate only. Every route handler and data access function
 * must still resolve the session from the database before acting on it.
 */
export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/founder/:path*'],
}

function isPublicAppPath(pathname: string): boolean {
  return pathname === '/app/auth' || pathname.startsWith('/app/auth/')
}

function isPlatformAuthPath(pathname: string): boolean {
  return pathname === '/platform/auth' || pathname.startsWith('/platform/auth/')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') || pathname.startsWith('/founder')) {
    const platformToken = request.cookies.get(PLATFORM_SESSION_COOKIE_NAME)?.value
    const platformUser = await resolvePlatformSessionFromToken(platformToken)

    if (!platformUser) {
      if (isPlatformAuthPath(pathname)) {
        const response = NextResponse.next()
        if (platformToken) response.cookies.delete(PLATFORM_SESSION_COOKIE_NAME)
        return response
      }

      const url = request.nextUrl.clone()
      url.pathname = '/platform/auth'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/admin') && !platformUser.canAccessAdminConsole) {
      if (platformUser.canAccessFounderDashboard) {
        const url = request.nextUrl.clone()
        url.pathname = '/founder'
        url.search = ''
        return NextResponse.redirect(url)
      }
      const url = request.nextUrl.clone()
      url.pathname = '/platform/auth'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/founder') && !platformUser.canAccessFounderDashboard) {
      if (platformUser.canAccessAdminConsole) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        url.search = ''
        return NextResponse.redirect(url)
      }
      const url = request.nextUrl.clone()
      url.pathname = '/platform/auth'
      url.search = ''
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  const publicPath = isPublicAppPath(pathname)

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const user = await resolveSessionFromToken(token)

  if (!user) {
    if (publicPath) {
      const response = NextResponse.next()
      if (token) response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    const url = request.nextUrl.clone()
    url.pathname = '/app/auth'
    url.search = ''
    url.searchParams.set('view', 'login')

    const params = new URLSearchParams(request.nextUrl.search)
    params.delete('next')
    const search = params.toString()
    url.searchParams.set('next', search ? `${pathname}?${search}` : pathname)

    const response = NextResponse.redirect(url)
    if (token) response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  const payload = toSessionPayload(user)

  if (!publicPath && !payload.emailVerified) {
    const url = request.nextUrl.clone()
    url.pathname = '/app/auth/verify-email'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (pathname === '/app/auth' && request.nextUrl.searchParams.get('view') !== 'signup') {
    const target = resolveSafeRedirect(request.nextUrl.searchParams.get('next'))
    const url = request.nextUrl.clone()
    url.pathname = payload.emailVerified ? '/app' : '/app/auth/verify-email'
    url.search = ''
    if (target && payload.emailVerified) {
      url.pathname = target
    }
    return NextResponse.redirect(url)
  }

  const headers = new Headers(request.headers)
  headers.set(REQUEST_USER_HEADERS.userId, payload.userId)
  headers.set(REQUEST_USER_HEADERS.businessId, payload.businessId)
  headers.set(REQUEST_USER_HEADERS.role, payload.role)
  headers.set(REQUEST_USER_HEADERS.email, payload.email)
  headers.set(REQUEST_USER_HEADERS.emailVerified, String(payload.emailVerified))

  return NextResponse.next({ request: { headers } })
}
