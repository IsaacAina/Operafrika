import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { hashToken } from '@/lib/token-hash'

export const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000
export const MAX_VERIFICATION_ATTEMPTS = 5

export type VerifyResult =
  | 'verified'
  | 'already-verified'
  | 'invalid'
  | 'expired'
  | 'too-many-attempts'

export function generateVerificationCode(): string {
  const range = 1_000_000
  const limit = Math.floor(0xffffffff / range) * range
  let value = randomBytes(4).readUInt32BE(0)
  while (value >= limit) {
    value = randomBytes(4).readUInt32BE(0)
  }
  return (value % range).toString().padStart(6, '0')
}

export async function issueVerificationCode(userId: string): Promise<string> {
  const code = generateVerificationCode()
  const expires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS)

  // Only the hash is stored. The raw code is emailed and never written down.
  await prisma.emailVerificationCode.upsert({
    where: { userId },
    update: { codeHash: hashToken(code), expires, attempts: 0 },
    create: { userId, codeHash: hashToken(code), expires },
  })

  return code
}

export async function sendVerificationEmail(email: string, code: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const link = `${appUrl}/app/auth/verify-email`

  const text = [
    `Your Operafrika verification code is ${code}.`,
    '',
    `Enter it at ${link} to verify your email address.`,
    'This code expires in 15 minutes.',
    '',
    "If you didn't create an Operafrika account, you can ignore this email.",
  ].join('\n')

  const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <p style="font-size: 15px;">Use the code below to verify your Operafrika account:</p>
        <p style="font-size: 34px; font-weight: bold; letter-spacing: 8px; margin: 24px 0; color: #111827;">${code}</p>
        <p style="font-size: 15px;">This code expires in 15 minutes.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify email</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">If you didn't create an Operafrika account, you can ignore this email.</p>
      </div>
    `

  await sendEmail({
    to: email,
    subject: 'Your Operafrika verification code',
    text,
    html,
  })
}

export async function verifyEmailCode(
  userId: string,
  code: string,
): Promise<VerifyResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  })

  if (!user) return 'invalid'
  if (user.emailVerifiedAt) return 'already-verified'

  const record = await prisma.emailVerificationCode.findUnique({
    where: { userId },
  })

  if (!record) return 'invalid'

  if (record.expires < new Date()) {
    await prisma.emailVerificationCode.deleteMany({ where: { userId } })
    return 'expired'
  }

  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    return 'too-many-attempts'
  }

  if (record.codeHash !== hashToken(code)) {
    await prisma.emailVerificationCode.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    })
    return 'invalid'
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationCode.deleteMany({ where: { userId } }),
  ])

  return 'verified'
}
