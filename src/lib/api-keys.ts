import { nanoid } from 'nanoid'
import { redis } from './redis'

export const APIKEY_PREFIX = 'apikey:'
export const APIKEY_META_PREFIX = 'apikey:meta:'

export type ApiKeyTier = 'free' | 'pro'

export interface ApiKeyData {
  email: string
  tier: ApiKeyTier
  createdAt: string
  usageCount: number
  label?: string
}

export interface ApiKeyListItem {
  keyId: string
  maskedKey: string
  label: string | null
  tier: ApiKeyTier
  createdAt: string
  lastFour: string
}

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

export function generateApiKey(): string {
  return `sk_live_${nanoid(32)}`
}

function getEmailKeyIndex(email: string) {
  return `${APIKEY_META_PREFIX}email:${email}`
}

function maskApiKey(key: string) {
  return `${key.slice(0, 11)}…${key.slice(-4)}`
}

export async function createApiKey(
  email: string,
  tier: ApiKeyTier = 'free',
  label?: string | null,
): Promise<{ key: string; data: ApiKeyData }> {
  const key = generateApiKey()
  const now = new Date().toISOString()

  const data: ApiKeyData = {
    email,
    tier,
    createdAt: now,
    usageCount: 0,
    ...(label?.trim() ? { label: label.trim().slice(0, 64) } : {}),
  }

  await redis.set(`${APIKEY_PREFIX}${key}`, JSON.stringify(data), { ex: 60 * 60 * 24 * 365 })
  await redis.sadd(getEmailKeyIndex(email), key)

  return { key, data }
}

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

export async function listApiKeys(email: string): Promise<ApiKeyListItem[]> {
  const keys = (await redis.smembers<string[]>(getEmailKeyIndex(email))) || []

  const records = await Promise.all(
    keys.map(async (key) => {
      const data = await validateApiKey(key)
      if (!data || data.email !== email) return null

      return {
        keyId: key,
        maskedKey: maskApiKey(key),
        label: data.label || null,
        tier: data.tier,
        createdAt: data.createdAt,
        lastFour: key.slice(-4),
      } satisfies ApiKeyListItem
    })
  )

  return records
    .filter((record): record is ApiKeyListItem => Boolean(record))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function revokeApiKey(email: string, keyId: string): Promise<boolean> {
  const data = await validateApiKey(keyId)

  if (!data || data.email !== email) {
    return false
  }

  await redis.del(`${APIKEY_PREFIX}${keyId}`)
  await redis.srem(getEmailKeyIndex(email), keyId)
  await redis.del(`${APIKEY_PREFIX}${keyId}:usage`)

  return true
}

export async function incrementUsage(key: string): Promise<void> {
  await redis.incr(`${APIKEY_PREFIX}${key}:usage`)
}

export function getRateLimitsForTier(tier: ApiKeyTier) {
  return TIER_LIMITS[tier]
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  const url = new URL(request.url)
  return url.searchParams.get('api_key')
}
