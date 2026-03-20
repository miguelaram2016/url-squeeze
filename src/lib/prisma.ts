import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaPg } from '@prisma/adapter-pg'

// Workaround: The Vercel/Neon integration adds channel_binding=require which causes
// the pg driver to hang in serverless environments. Strip it from the connection string.
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  // Remove channel_binding=require which causes issues with pg driver in serverless
  return url.replace(/&?channel_binding=require/g, '')
}

const connectionString = getDatabaseUrl()

// Create Neon pool (uses WebSockets instead of TCP)
const pool = new Pool({ connectionString })

// Create Prisma adapter
const adapter = new PrismaPg(pool)

// Create Prisma client with the adapter
const prisma = new PrismaClient({ adapter })

export { prisma }
