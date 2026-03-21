import { Redis } from '@upstash/redis'
import { isWhitelisted } from './whitelist'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || '',
})

// Rate limit by IP
// 10 requests per minute, 100 per day
// Whitelisted IPs bypass rate limits
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number; whitelisted: boolean }> {
  // Check whitelist first
  if (isWhitelisted(ip)) {
    return { allowed: true, remaining: 999, resetAt: Date.now() + 86400000, whitelisted: true }
  }

  const now = Date.now()
  const minuteKey = `ratelimit:min:${ip}`
  const dayKey = `ratelimit:day:${ip}`

  // Get current counts
  const [minuteCount, dayCount] = await redis.mget<number[]>([minuteKey, dayKey])
  
  const minuteUsed = minuteCount || 0
  const dayUsed = dayCount || 0

  // Check limits
  if (minuteUsed >= 10) {
    const ttl = await redis.ttl(minuteKey)
    return { allowed: false, remaining: 0, resetAt: now + (ttl > 0 ? ttl * 1000 : 60000), whitelisted: false }
  }
  
  if (dayUsed >= 100) {
    const ttl = await redis.ttl(dayKey)
    return { allowed: false, remaining: 0, resetAt: now + (ttl > 0 ? ttl * 1000 : 86400000), whitelisted: false }
  }

  // Increment counters (use pipeline for atomicity)
  const pipe = redis.pipeline()
  pipe.incr(minuteKey)
  pipe.expire(minuteKey, 60) // 1 minute window
  pipe.incr(dayKey)
  pipe.expire(dayKey, 86400) // 1 day window
  await pipe.exec()

  return { 
    allowed: true, 
    remaining: Math.min(9 - minuteUsed, 99 - dayUsed), 
    resetAt: now + 60000,
    whitelisted: false 
  }
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
