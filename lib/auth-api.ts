import { apiFetch } from '@/lib/api-client'

/**
 * The signed in user as the client sees it. It is display data only: every
 * route still resolves the session and its own authorization on the server.
 */
export interface AuthUser {
  id: string
  email: string
  role: string
  businessId: string
  businessName: string | null
  emailVerified: boolean
}

export interface LoginInput {
  email: string
  password: string
  next?: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
}

export interface AuthRedirectResult {
  success: true
  emailVerified: boolean
  redirect: string
}

export interface AccountDeletionResult {
  success: true
  message: string
  scheduledFor: string
  gracePeriodDays: number
  businessWillBeDeleted: boolean
  businessName: string
  emailSent: boolean
  warning: string | null
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const data = await apiFetch<{ user: AuthUser | null }>('/api/auth/me')
  return data.user
}

export function loginRequest(input: LoginInput): Promise<AuthRedirectResult> {
  return apiFetch<AuthRedirectResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function signupRequest(input: SignupInput): Promise<AuthRedirectResult> {
  return apiFetch<AuthRedirectResult>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function logoutRequest(): Promise<void> {
  await apiFetch<{ success: true }>('/api/auth/logout', { method: 'POST' })
}

export function deleteAccountRequest(): Promise<AccountDeletionResult> {
  return apiFetch<AccountDeletionResult>('/api/account/deletion', {
    method: 'POST',
  })
}
