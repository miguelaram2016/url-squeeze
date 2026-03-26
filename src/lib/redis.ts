import { Redis } from '@upstash/redis'

function getRequiredEnv(name: 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN') {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

export function createRedisClient() {
  return new Redis({
    url: getRequiredEnv('UPSTASH_REDIS_REST_URL'),
    token: getRequiredEnv('UPSTASH_REDIS_REST_TOKEN'),
  })
}

export const redis = createRedisClient()

export const REDIRECT_PREFIX = 'r:'
export const CLICKS_PREFIX = 'c:'
export const INFO_PREFIX = 'i:'
export const SLUG_INDEX = 'slug:idx'
export const USER_LINKS_PREFIX = 'ul:'
export const CLICK_EVENTS_PREFIX = 'ce:'
export const CLICK_COUNTRY_PREFIX = 'cc:'
export const CLICK_REFERRER_PREFIX = 'cr:'
export const CLICK_DEVICE_PREFIX = 'cd:'

export interface LinkInfo {
  url: string
  slug: string
  createdAt: string
  splash?: string
  ownerId?: string
}

export function getUserLinksKey(ownerId: string) {
  return `${USER_LINKS_PREFIX}${ownerId}`
}

export function getLinkKeys(slug: string) {
  return {
    redirect: `${REDIRECT_PREFIX}${slug}`,
    clicks: `${CLICKS_PREFIX}${slug}`,
    info: `${INFO_PREFIX}${slug}`,
  }
}
