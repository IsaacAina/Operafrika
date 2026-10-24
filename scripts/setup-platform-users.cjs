const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { PrismaPg } = require('@prisma/adapter-pg')
require('dotenv').config()

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function main() {
  const h = await bcrypt.hash('caasi99$', 10)
  await prisma.platformUser.upsert({
    where: { email: 'isaacaina9@gmail.com' },
    update: { passwordHash: h, canAccessAdminConsole: true, canAccessFounderDashboard: true },
    create: { email: 'isaacaina9@gmail.com', passwordHash: h, canAccessAdminConsole: true, canAccessFounderDashboard: true },
  })
  await prisma.platformUser.upsert({
    where: { email: 'get2aina@outlook.com' },
    update: { passwordHash: h, canAccessAdminConsole: true, canAccessFounderDashboard: true },
    create: { email: 'get2aina@outlook.com', passwordHash: h, canAccessAdminConsole: true, canAccessFounderDashboard: true },
  })
  try {
    await prisma.user.deleteMany({ where: { email: 'get2aina@outlook.com' } })
  } catch (e) {}
  console.log('done')
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
