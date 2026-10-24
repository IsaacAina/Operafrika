import { z } from 'zod'

const emailSchema = z
  .string({ error: 'This field must not be empty' })
  .trim()
  .min(1, 'This field must not be empty')
  .toLowerCase()
  .pipe(z.email('Enter a valid email address'))

// Passwords are never trimmed. Argon2 verifies the exact byte sequence the
// user chose, so any normalisation here would change the credential itself.
const passwordSchema = z
  .string({ error: 'This field must not be empty' })
  .min(1, 'This field must not be empty')
  .min(8, 'Password must be at least 8 characters.')
  .refine((value) => value.trim().length > 0, 'This field must not be empty')

// Login only requires that a password was supplied. The length rule belongs to
// signup and reset, not to credential checking.
const loginPasswordSchema = z
  .string({ error: 'This field must not be empty' })
  .min(1, 'This field must not be empty')

const nameSchema = z
  .string({ error: 'This field must not be empty' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .refine(
    (value) => value.split(/\s+/).length >= 2,
    'Enter at least two names separated by a space.',
  )

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  next: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z
    .string({ error: 'Reset token is required.' })
    .min(1, 'Reset token is required.'),
  password: passwordSchema,
})

export const verifyEmailSchema = z.object({
  code: z
    .string({ error: 'Enter the 6-digit code.' })
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code.'),
})

export const businessSetupSchema = z.object({
  businessName: z
    .string({ error: 'Business name is required' })
    .trim()
    .min(2, 'Business name must be at least 2 characters.')
    .max(100, 'Business name is too long.'),
  businessType: z
    .string({ error: 'Business type is required' })
    .trim()
    .min(2, 'Please select or enter a business type.')
    .max(50, 'Business type is too long.'),
  currency: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .default('NGN'),
  contactInfo: z
    .string()
    .trim()
    .max(100, 'Contact info is too long.')
    .optional()
    .nullable(),
  branchName: z
    .string({ error: 'Branch name is required' })
    .trim()
    .min(2, 'Branch name must be at least 2 characters.')
    .max(100, 'Branch name is too long.')
    .default('Main Branch'),
  branchAddress: z
    .string()
    .trim()
    .max(255, 'Branch address is too long.')
    .optional()
    .nullable(),
  branchContactInfo: z
    .string()
    .trim()
    .max(100, 'Branch contact info is too long.')
    .optional()
    .nullable(),
})

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return undefined
  }
}
