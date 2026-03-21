import { Redis } from '@upstash/redis'
import { isWhitelisted } from './whitelist'
import { extractApiKey, validateApiKey, getRateLimitsForTier, ApiKeyTier } from './api-keys'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || '',
})

// Default IP-based limits (for unauthenticated requests)
const DEFAULT_DAY_LIMIT = 100
const DEFAULT_MIN_LIMIT = 10

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  whitelisted: boolean
  tier?: ApiKeyTier
  isApiKey?: boolean
}

/**
 * Check rate limit for a request, supporting both IP-based and API key auth.
 * API key auth gets tier-based limits; unauthenticated requests get IP-based limits.
 */
export async function checkRateLimit(request: Request, ip: string): Promise<RateLimitResult> {
  // Check whitelist first (IP-based)
  if (isWhitelisted(ip)) {
    return { allowed: true, remaining: 999, resetAt: Date.now() + 86400000, whitelisted: true }
  }

  // Try API key auth first (takes precedence)
  const apiKey = extractApiKey(request)
  if (apiKey) {
    const keyData = await validateApiKey(apiKey)
    if (keyData) {
      return checkApiKeyRateLimit(apiKey, keyData.tier)
    }
    // Invalid API key — fall through to IP-based (don't block, just don't grant API key privileges)
  }

  // IP-based rate limit (for unauthenticated or invalid API key)
  return checkIpRateLimit(ip)
}

/**
 * Rate limit check for API key authenticated requests
 */
async function checkApiKeyRateLimit(key: string, tier: ApiKeyTier): Promise<RateLimitResult> {
  const limits = getRateLimitsForTier(tier)
  const now = Date.now()
  const minuteKey = `ratelimit:apikey:min:${key}`
  const dayKey = `ratelimit:apikey:day:${key}`

  const [minuteCount, dayCount] = await redis.mget<number[]>([minuteKey, dayKey])

  const minuteUsed = minuteCount || 0
  const dayUsed = dayCount || 0

  if (minuteUsed >= limits.requestsPerMinute) {
    const ttl = await redis.ttl(minuteKey)
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + (ttl > 0 ? ttl * 1000 : 60000),
      whitelisted: false,
      tier,
      isApiKey: true,
    }
  }

  if (dayUsed >= limits.requestsPerDay) {
    const ttl = await redis.ttl(dayKey)
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + (ttl > 0 ? ttl * 1000 : 86400000),
      whitelisted: false,
      tier,
      isApiKey: true,
    }
  }

  // Increment counters
  const pipe = redis.pipeline()
  pipe.incr(minuteKey)
  pipe.expire(minuteKey, 60)
  pipe.incr(dayKey)
  pipe.expire(dayKey, 86400)
  await pipe.exec()

  return {
    allowed: true,
    remaining: Math.min(
      limits.requestsPerMinute - 1 - minuteUsed,
      limits.requestsPerDay - 1 - dayUsed
    ),
    resetAt: now + 60000,
    whitelisted: false,
    tier,
    isApiKey: true,
  }
}

/**
 * Rate limit check for IP-based (unauthenticated) requests
 */
async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  const now = Date.now()
  const minuteKey = `ratelimit:min:${ip}`
  const dayKey = `ratelimit:day:${ip}`

  const [minuteCount, dayCount] = await redis.mget<number[]>([minuteKey, dayKey])

  const minuteUsed = minuteCount || 0
  const dayUsed = dayCount || 0

  if (minuteUsed >= DEFAULT_MIN_LIMIT) {
    const ttl = await redis.ttl(minuteKey)
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + (ttl > 0 ? ttl * 1000 : 60000),
      whitelisted: false,
    }
  }

  if (dayUsed >= DEFAULT_DAY_LIMIT) {
    const ttl = await redis.ttl(dayKey)
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + (ttl > 0 ? ttl * 1000 : 86400000),
      whitelisted: false,
    }
  }

  const pipe = redis.pipeline()
  pipe.incr(minuteKey)
  pipe.expire(minuteKey, 60)
  pipe.incr(dayKey)
  pipe.expire(dayKey, 86400)
  await pipe.exec()

  return {
    allowed: true,
    remaining: Math.min(DEFAULT_MIN_LIMIT - 1 - minuteUsed, DEFAULT_DAY_LIMIT - 1 - dayUsed),
    resetAt: now + 60000,
    whitelisted: false,
  }
}

/**
 * Legacy function for backwards compatibility with code that passes just IP
 */
export async function checkRateLimitByIp(ip: string): Promise<RateLimitResult> {
  return checkIpRateLimit(ip)
}

// Get client IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  return '127.0.0.1'
}
