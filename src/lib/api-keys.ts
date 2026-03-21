import { Redis } from '@upstash/redis'
import { nanoid } from 'nanoid'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || '',
})

export const APIKEY_PREFIX = 'apikey:'
export const APIKEY_META_PREFIX = 'apikey:meta:'

export type ApiKeyTier = 'free' | 'pro'

export interface ApiKeyData {
  email: string
  tier: ApiKeyTier
  createdAt: string
  usageCount: number
}

// Rate limits per tier
export const TIER_LIMITS = {
  free: {
    requestsPerDay: 1000,
    requestsPerMinute: 10,
  },
  pro: {
    requestsPerDay: 10000,
    requestsPerMinute: 100,
  },
} as const

/**
 * Generate a new API key (Stripe-like format)
 */
export function generateApiKey(): string {
  return `sk_live_${nanoid(32)}`
}

/**
 * Store a new API key in Redis
 */
export async function createApiKey(email: string, tier: ApiKeyTier = 'free'): Promise<{ key: string; data: ApiKeyData }> {
  const key = generateApiKey()
  const now = new Date().toISOString()

  const data: ApiKeyData = {
    email,
    tier,
    createdAt: now,
    usageCount: 0,
  }

  // Store the key -> metadata mapping
  await redis.set(`${APIKEY_PREFIX}${key}`, JSON.stringify(data), { ex: 60 * 60 * 24 * 365 }) // 1 year expiry

  // Also index by email for lookup
  await redis.sadd(`${APIKEY_META_PREFIX}email:${email}`, key)

  return { key, data }
}

/**
 * Validate an API key and return its data if valid
 */
export async function validateApiKey(key: string): Promise<ApiKeyData | null> {
  if (!key || !key.startsWith('sk_live_')) {
    return null
  }

  const data = await redis.get<string>(`${APIKEY_PREFIX}${key}`)
  if (!data) {
    return null
  }

  try {
    return JSON.parse(data) as ApiKeyData
  } catch {
    return null
  }
}

/**
 * Increment usage count for an API key
 */
export async function incrementUsage(key: string): Promise<void> {
  await redis.incr(`${APIKEY_PREFIX}${key}:usage`)
}

/**
 * Get rate limit config for a tier
 */
export function getRateLimitsForTier(tier: ApiKeyTier) {
  return TIER_LIMITS[tier]
}

/**
 * Extract API key from Authorization header or query param
 */
export function extractApiKey(request: Request): string | null {
  // Try Authorization header first: "Bearer sk_live_xxxxx"
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Try query param: ?api_key=xxxxx
  const url = new URL(request.url)
  return url.searchParams.get('api_key')
}
