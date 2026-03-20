import { PrismaClient } from '@prisma/client'

function getDatabaseUrl(): string {
  // Use the non-pooled endpoint for serverless (pooler can have connection issues)
  const url = process.env.DATABASE_URL_UNPOOLED || 
              process.env.POSTGRES_URL_NON_POOLING || 
              process.env.DATABASE_URL
  
  if (!url) throw new Error('No database URL')
  
  // Clean up the URL
  let cleaned = url.replace(/&?channel_binding=require/g, '')
  
  // Ensure we have a timeout
  if (!cleaned.includes('connect_timeout')) {
    cleaned += cleaned.includes('?') ? '&connect_timeout=10' : '?connect_timeout=10'
  }
  
  return cleaned
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
