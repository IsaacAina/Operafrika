import { NextResponse } from 'next/server'
import { clearSession, getSession } from '@/lib/auth'
import {
  AccountDeletionError,
  requestAccountDeletion,
} from '@/lib/account-deletion'
import { sendAccountDeletionScheduledEmail } from '@/lib/account-deletion-email'
import { withTimeout } from '@/lib/with-timeout'

/**
 * The confirmation email must not hold the request open for long. When the
 * mail server is slow or down the request still finishes, and the owner is
 * told that the email did not go out.
 */
const EMAIL_TIMEOUT_MS = 15000

/**
 * Closes the signed in account and schedules it for deletion.
 *
 * The response says whether the confirmation email went out. A failed email
 * does not undo the deletion, but the owner has to know that the cancellation
 * link did not reach them.
 */
export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: 'You must be signed in to delete your account.' },
      { status: 401 },
    )
  }

  let outcome
  try {
    outcome = await requestAccountDeletion(session.userId)
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Account deletion could not be scheduled:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }

  // Every session was revoked with the account. Clear the browser cookie too.
  await clearSession()

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const cancelUrl = `${appUrl}/app/auth/cancel-deletion?token=${encodeURIComponent(outcome.cancelToken)}`

  let emailSent = true
  try {
    await withTimeout(
      sendAccountDeletionScheduledEmail({
        to: outcome.email,
        scheduledFor: outcome.scheduledFor,
        gracePeriodDays: outcome.gracePeriodDays,
        cancelUrl,
        businessWillBeDeleted: outcome.businessScheduledFor !== null,
        businessName: outcome.businessName,
      }),
      EMAIL_TIMEOUT_MS,
    )
  } catch (error) {
    emailSent = false
    console.error('Deletion confirmation email could not be sent:', error)
  }

  return NextResponse.json({
    success: true,
    message: `Your account will be permanently deleted on ${outcome.scheduledFor.toISOString().slice(0, 10)}.`,
    scheduledFor: outcome.scheduledFor.toISOString(),
    gracePeriodDays: outcome.gracePeriodDays,
    businessWillBeDeleted: outcome.businessScheduledFor !== null,
    businessName: outcome.businessName,
    emailSent,
    warning: emailSent
      ? null
      : 'The account was scheduled for deletion, but the email with the cancellation link could not be sent. Contact support if you want to keep it.',
  })
}
