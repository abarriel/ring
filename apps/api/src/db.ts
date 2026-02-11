import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../prisma/generated/prisma/client.js'

const adapter = new PrismaPg({
  connectionString: Bun.env.DATABASE_URL,
})

export const db = new PrismaClient({ adapter })
