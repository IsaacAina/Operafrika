import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

/**
 * Bare client for tables that are not protected by RLS (sessions, platform
 * accounts) and for the RLS helpers themselves. Business data must be queried
 * through withRls/withSystemRls from lib/rls.ts.
 */
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
