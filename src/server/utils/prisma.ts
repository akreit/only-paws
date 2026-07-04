import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import process from 'process'

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

type PrismaClientInstance = ReturnType<typeof prismaClientSingleton>

declare global {
  var __prisma: PrismaClientInstance | undefined
}

const prisma: PrismaClientInstance = globalThis.__prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma
