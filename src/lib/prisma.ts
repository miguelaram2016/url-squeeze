import { PrismaClient } from '@prisma/client'

// Workaround: The Vercel/Neon integration adds channel_binding=require which causes
// the pg driver to hang in serverless environments. Strip it from the connection string.
function getCleanDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  // Remove channel_binding=require which causes issues with pg driver in serverless
  return url.replace(/&?channel_binding=require/g, '')
}

// Use the cleaned URL for Prisma
const cleanUrl = getCleanDatabaseUrl()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: cleanUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
