import { NextResponse } from 'next/server'
import { cancelAccountDeletion } from '@/lib/account-deletion'
import { sendAccountDeletionCancelledEmail } from '@/lib/account-deletion-email'
import { withTimeout } from '@/lib/with-timeout'

/** The confirmation email must not hold the request open for long. */
const EMAIL_TIMEOUT_MS = 15000

/**
 * Brings an account back during its grace period.
 *
 * The request carries the one time token from the deletion email. The token
 * is compared against the hash stored on the account, and it stops working
 * once it has been used.
 */
export async function POST(request: Request) {
  let token = ''
  try {
    const body = await request.json()
    if (body && typeof body.token === 'string') token = body.token
  } catch {
    token = ''
  }

  if (!token) {
    return NextResponse.json(
      { error: 'This cancellation link is invalid or has expired.' },
      { status: 400 },
    )
  }

  let result
  try {
    result = await cancelAccountDeletion(token)
  } catch (error) {
    console.error('Account deletion could not be cancelled:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }

  if (!result) {
    return NextResponse.json(
      { error: 'This cancellation link is invalid or has expired.' },
      { status: 404 },
    )
  }

  try {
    await withTimeout(
      sendAccountDeletionCancelledEmail({ to: result.email }),
      EMAIL_TIMEOUT_MS,
    )
  } catch (error) {
    // The cancellation already happened. A failed email must not undo it.
    console.error('Deletion cancellation email could not be sent:', error)
  }

  return NextResponse.json({
    success: true,
    message: 'Your account is open again. You can sign in as usual.',
  })
}
