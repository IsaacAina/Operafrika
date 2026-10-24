import { QueryClient, dehydrate } from '@tanstack/react-query'
import { authKeys } from '@/lib/auth-keys'
import { readCurrentUser } from '@/lib/current-user'

/**
 * Creates a dehydrated query state for a page.
 *
 * Auth pages can still render without a cached user, but seeding the cache
 * here keeps the client state consistent if a session exists (and avoids a
 * flash of "signed out" UI).
 */
export async function createClientHydrationBoundary() {
  const queryClient = new QueryClient()
  const user = await readCurrentUser()
  queryClient.setQueryData(authKeys.me(), user)
  return { state: dehydrate(queryClient) }
}
