import { Prisma } from '@prisma/client'

/**
 * True when the database rejected a write because it broke a unique
 * constraint.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}
