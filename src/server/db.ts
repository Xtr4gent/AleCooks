import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'
import { env } from './env.js'

declare global {
  var __alecooksPrisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__alecooksPrisma ??
  new PrismaClient({
    adapter: new PrismaPg(env.DATABASE_URL),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__alecooksPrisma = prisma
}
