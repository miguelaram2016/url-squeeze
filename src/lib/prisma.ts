import { PrismaClient } from '@prisma/client'

// Workaround: Try different Neon connection URLs to find one that works
function getDatabaseUrl(): string {
  // Try the unpooled endpoint first (direct connection, no pooler)
  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED
  const prismaUrl = process.env.POSTGRES_PRISMA_URL
  const databaseUrl = process.env.DATABASE_URL
  
  // Try unpooled first - it bypasses the pooler which can have connectivity issues
  if (unpooledUrl) {
    console.log('Using unpooled endpoint')
    return unpooledUrl.replace(/&?channel_binding=require/g, '')
  }
  
  // Fall back to POSTGRES_PRISMA_URL (has connect_timeout)
  if (prismaUrl) {
    console.log('Using POSTGRES_PRISMA_URL')
    return prismaUrl.replace(/&?channel_binding=require/g, '')
  }
  
  // Last resort: DATABASE_URL
  if (databaseUrl) {
    console.log('Using DATABASE_URL')
    return databaseUrl.replace(/&?channel_binding=require/g, '')
  }
  
  throw new Error('No database URL available')
}

const cleanUrl = getDatabaseUrl()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: cleanUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
