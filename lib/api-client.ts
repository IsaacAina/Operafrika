/**
 * A small wrapper around fetch for the app's own JSON endpoints.
 *
 * The server always answers with either a JSON body or an `{ error }` object.
 * Turning a non-2xx response into a typed error means the query and mutation
 * hooks can surface the server's message without repeating that parsing.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: unknown }).error
    if (typeof error === 'string' && error.length > 0) return error
  }
  return `Request failed (${status}).`
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    throw new ApiError(readErrorMessage(body, response.status), response.status)
  }

  return body as T
}
