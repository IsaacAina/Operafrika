/**
 * Cache keys for auth state.
 *
 * Kept in its own module with no `'use client'` directive so both server
 * components (to seed the cache) and client hooks (to read it) can import the
 * same values. Importing a value from a `'use client'` module into a server
 * component is not allowed.
 */
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}
