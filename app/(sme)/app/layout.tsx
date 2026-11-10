import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { authKeys } from '@/lib/auth-keys'
import { readCurrentUser } from '@/lib/current-user'
import AiAssistantWidget from './ai-assistant-widget'

/**
 * Seeds the client query cache with the user the server already resolved.
 *
 * Without this the cached user would be empty on first paint and every screen
 * would show a loading state before the browser asks again. The client gets
 * the same value the server rendered with, then revalidates later if needed.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = new QueryClient()
  const user = await readCurrentUser()
  queryClient.setQueryData(authKeys.me(), user)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
      {user && <AiAssistantWidget userRole={user.role} businessId={user.businessId} />}
    </HydrationBoundary>
  )
}
