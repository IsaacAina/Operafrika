/**
 * Rejects when the work takes longer than the given number of milliseconds.
 *
 * Used to keep a slow third party, such as the mail server, from holding an
 * API request open. The work itself is not cancelled: it is left to finish on
 * its own.
 */
export async function withTimeout<T>(
  work: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out after ${ms}ms`)),
          ms,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
