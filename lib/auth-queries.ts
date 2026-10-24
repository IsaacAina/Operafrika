'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { authKeys } from '@/lib/auth-keys'
import {
  deleteAccountRequest,
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  signupRequest,
} from '@/lib/auth-api'
import { ApiError } from '@/lib/api-client'

/**
 * Auth state on the client.
 *
 * The cache holds a copy of who the server says is signed in. It exists so
 * screens do not each refetch the session, not so the client can decide what
 * it is allowed to do: authorization stays on the server, and the cached user
 * is display data only.
 */

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchCurrentUser,
    // The session is seeded from the server on first render and only changes
    // through an explicit action, so a short freshness window avoids a
    // request on every navigation.
    staleTime: 60_000,
    retry: 1,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation<Awaited<ReturnType<typeof loginRequest>>, ApiError, Parameters<typeof loginRequest>[0]>({
    mutationFn: loginRequest,
    onSuccess: async () => {
      // A new session cookie was issued, so replace the cached copy with the
      // server's view instead of guessing it from the form.
      await queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation<Awaited<ReturnType<typeof signupRequest>>, ApiError, Parameters<typeof signupRequest>[0]>({
    mutationFn: signupRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, void>({
    mutationFn: logoutRequest,
    onSuccess: () => {
      // The session is gone. Drop the cached user so nothing keeps rendering a
      // signed in state while the page navigates away.
      queryClient.setQueryData(authKeys.me(), null)
      queryClient.removeQueries({ queryKey: authKeys.all })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation<Awaited<ReturnType<typeof deleteAccountRequest>>, ApiError, void>({
    mutationFn: deleteAccountRequest,
    onSuccess: () => {
      // Deleting the account closes the session, so the cached user is stale
      // and must not survive in memory.
      queryClient.setQueryData(authKeys.me(), null)
      queryClient.clear()
    },
  })
}
