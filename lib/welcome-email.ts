import { sendEmail } from '@/lib/email'

export async function sendWelcomeEmail(email: string, fullName: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const link = `${appUrl}/app`

  const text = [
    `Welcome to Operafrika, ${fullName}!`,
    '',
    "Thank you for joining us. We're excited to have you on board.",
    'Your account has been created successfully. You can now start managing your business with ease.',
    '',
    `Get started at ${link}.`,
    '',
    'Welcome to our brand!',
  ].join('\n')

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a73e8;">Welcome to Operafrika!</h2>
          <p>Hi ${fullName},</p>
          <p>Thank you for joining us. We're excited to have you on board.</p>
          <p>Your account has been created successfully. You can now start managing your business with ease.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Get Started</a>
          </p>
          <p>Welcome to our brand!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Operafrika - Business Operating System for African SMEs</p>
        </div>
      `

  await sendEmail({
    to: email,
    subject: 'Welcome to Operafrika',
    text,
    html,
  })
}
