import { register } from 'node:module'
import 'dotenv/config'

register('./ts-resolver.mjs', import.meta.url)

const { prisma } = await import('../lib/db.ts')

const email = process.argv[2] || 'owner.test@operafrika.local'
const state = process.argv[3] // 'complete' or 'reset'

if (state === 'complete') {
  await prisma.user.update({
    where: { email },
    data: { onboardingCompletedAt: new Date() },
  })
  console.log(`Set onboardingCompletedAt = new Date() for ${email}`)
} else {
  await prisma.user.update({
    where: { email },
    data: { onboardingCompletedAt: null },
  })
  console.log(`Reset onboardingCompletedAt = null for ${email}`)
}

await prisma.$disconnect()
