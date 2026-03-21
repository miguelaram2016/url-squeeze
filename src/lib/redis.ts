import { Redis } from '@upstash/redis'

// Create Redis client from environment variables
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Key helpers
export const REDIRECT_PREFIX = 'r:'
export const CLICKS_PREFIX = 'c:'
export const INFO_PREFIX = 'i:'
export const SLUG_INDEX = 'slug:idx'
export const USER_LINKS_PREFIX = 'ul:'
