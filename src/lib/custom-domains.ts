import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || '',
})

export const CUSTOM_DOMAIN_PREFIX = 'customdomain:'

export interface CustomDomainData {
  domain: string
  brandName: string
  ownerEmail: string
  createdAt: string
  active: boolean
}

/**
 * Register a custom domain for a brand
 */
export async function registerCustomDomain(
  domain: string,
  brandName: string,
  ownerEmail: string
): Promise<CustomDomainData> {
  const normalizedDomain = domain.toLowerCase().trim()
  const now = new Date().toISOString()

  const data: CustomDomainData = {
    domain: normalizedDomain,
    brandName,
    ownerEmail,
    createdAt: now,
    active: true,
  }

  await redis.set(
    `${CUSTOM_DOMAIN_PREFIX}${normalizedDomain}`,
    JSON.stringify(data),
    { ex: 60 * 60 * 24 * 365 } // 1 year expiry
  )

  // Index by owner email
  await redis.sadd(`customdomain:owner:${ownerEmail}`, normalizedDomain)

  return data
}

/**
 * Lookup a custom domain by hostname
 */
export async function getCustomDomain(hostname: string): Promise<CustomDomainData | null> {
  const normalized = hostname.toLowerCase().trim()
  const data = await redis.get<string>(`${CUSTOM_DOMAIN_PREFIX}${normalized}`)

  if (!data) return null

  try {
    return JSON.parse(data) as CustomDomainData
  } catch {
    return null
  }
}

/**
 * List custom domains for an owner email
 */
export async function listCustomDomains(ownerEmail: string): Promise<string[]> {
  const domains = await redis.smembers<string[]>(`customdomain:owner:${ownerEmail}`)
  return domains || []
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomain(domain: string, ownerEmail: string): Promise<boolean> {
  const normalized = domain.toLowerCase().trim()

  // Verify ownership
  const data = await getCustomDomain(normalized)
  if (!data || data.ownerEmail !== ownerEmail) {
    return false
  }

  await redis.del(`${CUSTOM_DOMAIN_PREFIX}${normalized}`)
  await redis.srem(`customdomain:owner:${ownerEmail}`, normalized)

  return true
}
