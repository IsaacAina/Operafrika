import { sendEmail } from '@/lib/email'

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface AccountDeletionScheduledEmail {
  to: string
  scheduledFor: Date
  gracePeriodDays: number
  cancelUrl: string
  businessWillBeDeleted: boolean
  businessName?: string | null
}

/**
 * The account has no display name, so the local part of the email is used to
 * address the owner.
 */
function displayNameFromEmail(email: string): string {
  return email.split('@')[0] || email
}

/**
 * Confirms that the account was closed and tells the owner how to get it
 * back. The cancellation link carries a one time token.
 */
export async function sendAccountDeletionScheduledEmail(
  details: AccountDeletionScheduledEmail,
): Promise<void> {
  const { to, scheduledFor, gracePeriodDays, cancelUrl } = details
  const fullName = displayNameFromEmail(to)

  const businessWarning = details.businessWillBeDeleted
    ? [
        `Your business "${details.businessName ?? ''}" has no other owner, so it will be deleted as well on ${formatDate(scheduledFor)}, together with every record inside it.`,
        '',
      ]
    : []

  const text = [
    `Hi ${fullName},`,
    '',
    'Your Operafrika account has been closed.',
    '',
    `Your data will be permanently deleted on ${formatDate(scheduledFor)}, which is ${gracePeriodDays} days from now.`,
    ...businessWarning,
    'Changed your mind? You can cancel the deletion before the date above:',
    cancelUrl,
    '',
    'After the deletion runs, the account and its data cannot be recovered.',
    '',
    'Operafrika',
  ].join('\n')

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a73e8;">Your Operafrika account has been closed</h2>
          <p>Hi ${fullName},</p>
          <p>Your account has been closed and your data will be permanently deleted on <strong>${formatDate(scheduledFor)}</strong>.</p>
          ${
            details.businessWillBeDeleted
              ? `<p style="color: #b3261e;">Your business "${details.businessName ?? ''}" has no other owner, so it will be deleted as well on that date, together with every record inside it.</p>`
              : ''
          }
          <p style="text-align: center; margin: 30px 0;">
            <a href="${cancelUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Keep my account</a>
          </p>
          <p>After the deletion runs, the account and its data cannot be recovered.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Operafrika - Business Operating System for African SMEs</p>
        </div>
      `

  await sendEmail({
    to,
    subject: 'Your Operafrika account has been closed',
    text,
    html,
  })
}

/**
 * Confirms that a scheduled deletion was called off.
 */
export async function sendAccountDeletionCancelledEmail(
  details: { to: string },
): Promise<void> {
  const { to } = details
  const fullName = displayNameFromEmail(to)

  const text = [
    `Hi ${fullName},`,
    '',
    'Good news. The deletion of your Operafrika account has been cancelled.',
    '',
    'Your account is open again and you can sign in as usual.',
    '',
    'Operafrika',
  ].join('\n')

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a73e8;">Your account is safe</h2>
          <p>Hi ${fullName},</p>
          <p>The deletion of your Operafrika account has been cancelled. Your account is open again and you can sign in as usual.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Operafrika - Business Operating System for African SMEs</p>
        </div>
      `

  await sendEmail({
    to,
    subject: 'Your Operafrika account deletion was cancelled',
    text,
    html,
  })
}
