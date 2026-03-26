import { redis, INFO_PREFIX } from './redis'

export const CUSTOM_DOMAIN_PREFIX = 'customdomain:'
export const CUSTOM_DOMAIN_SLUG_PREFIX = 'customdomain:slug:'

export interface CustomDomainData {
  domain: string
  brandName: string
  ownerEmail: string
  createdAt: string
  active: boolean
  status: 'pending' | 'verified'
  verificationTarget: string
  defaultSlug?: string
  verifiedAt?: string
}

const DEFAULT_VERIFICATION_TARGET = process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'cname.url-squeeze.vercel.app'

function normalizeDomain(domain: string) {
  return domain.toLowerCase().trim().replace(/\.$/, '')
}

function normalizeSlug(slug: string) {
  return slug.trim()
}

function getOwnerDomainsKey(ownerEmail: string) {
  return `customdomain:owner:${ownerEmail}`
}

function getDomainSlugKey(domain: string) {
  return `${CUSTOM_DOMAIN_SLUG_PREFIX}${normalizeDomain(domain)}`
}

export function getDomainVerificationInstructions(domain: string) {
  return {
    type: 'CNAME' as const,
    host: domain,
    value: DEFAULT_VERIFICATION_TARGET,
    note: 'Point the exact hostname you want to use for short links to this target, then verify it here.',
  }
}

export async function registerCustomDomain(
  domain: string,
  brandName: string,
  ownerEmail: string
): Promise<CustomDomainData> {
  const normalizedDomain = normalizeDomain(domain)
  const existing = await getCustomDomain(normalizedDomain)

  if (existing && existing.ownerEmail !== ownerEmail) {
    throw new Error('DOMAIN_TAKEN')
  }

  if (existing && existing.ownerEmail === ownerEmail) {
    return existing
  }

  const now = new Date().toISOString()

  const data: CustomDomainData = {
    domain: normalizedDomain,
    brandName: brandName.trim(),
    ownerEmail,
    createdAt: now,
    active: true,
    status: 'pending',
    verificationTarget: DEFAULT_VERIFICATION_TARGET,
  }

  await redis.set(
    `${CUSTOM_DOMAIN_PREFIX}${normalizedDomain}`,
    JSON.stringify(data),
    { ex: 60 * 60 * 24 * 365 }
  )

  await redis.sadd(getOwnerDomainsKey(ownerEmail), normalizedDomain)

  return data
}

export async function getCustomDomain(hostname: string): Promise<CustomDomainData | null> {
  const normalized = normalizeDomain(hostname)
  const data = await redis.get<string>(`${CUSTOM_DOMAIN_PREFIX}${normalized}`)

  if (!data) return null

  try {
    return JSON.parse(data) as CustomDomainData
  } catch {
    return null
  }
}

export async function listCustomDomains(ownerEmail: string): Promise<CustomDomainData[]> {
  const domains = await redis.smembers<string[]>(getOwnerDomainsKey(ownerEmail))
  const records = await Promise.all((domains || []).map((domain) => getCustomDomain(domain)))

  return records
    .filter((record): record is CustomDomainData => Boolean(record && record.ownerEmail === ownerEmail))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function removeCustomDomain(domain: string, ownerEmail: string): Promise<boolean> {
  const normalized = normalizeDomain(domain)
  const data = await getCustomDomain(normalized)

  if (!data || data.ownerEmail !== ownerEmail) {
    return false
  }

  const pipeline = redis.pipeline()
  pipeline.del(`${CUSTOM_DOMAIN_PREFIX}${normalized}`)
  pipeline.del(getDomainSlugKey(normalized))
  pipeline.srem(getOwnerDomainsKey(ownerEmail), normalized)
  await pipeline.exec()

  return true
}

export async function verifyCustomDomain(domain: string, ownerEmail: string): Promise<CustomDomainData | null> {
  const normalized = normalizeDomain(domain)
  const data = await getCustomDomain(normalized)

  if (!data || data.ownerEmail !== ownerEmail) {
    return null
  }

  try {
    const dns = await import('node:dns/promises')
    const cnameRecords = await dns.resolveCname(normalized).catch(() => []) as string[]
    const verified = cnameRecords.some((record) => record.replace(/\.$/, '') === data.verificationTarget)

    if (!verified) {
      return data
    }

    const next: CustomDomainData = {
      ...data,
      status: 'verified',
      verifiedAt: data.verifiedAt || new Date().toISOString(),
    }

    await redis.set(`${CUSTOM_DOMAIN_PREFIX}${normalized}`, JSON.stringify(next), { ex: 60 * 60 * 24 * 365 })
    return next
  } catch {
    return data
  }
}

export async function setCustomDomainDefaultSlug(
  domain: string,
  slug: string,
  ownerEmail: string,
): Promise<CustomDomainData | null> {
  const normalizedDomain = normalizeDomain(domain)
  const normalizedSlug = normalizeSlug(slug)
  const domainData = await getCustomDomain(normalizedDomain)

  if (!domainData || domainData.ownerEmail !== ownerEmail) {
    return null
  }

  if (!normalizedSlug) {
    const next: CustomDomainData = {
      ...domainData,
      defaultSlug: undefined,
    }

    const pipeline = redis.pipeline()
    pipeline.set(`${CUSTOM_DOMAIN_PREFIX}${normalizedDomain}`, JSON.stringify(next), { ex: 60 * 60 * 24 * 365 })
    pipeline.del(getDomainSlugKey(normalizedDomain))
    await pipeline.exec()
    return next
  }

  const info = await redis.hgetall<Record<string, string>>(`${INFO_PREFIX}${normalizedSlug}`)
  if (!info?.slug) {
    throw new Error('SLUG_NOT_FOUND')
  }

  if (info.ownerId !== ownerEmail) {
    throw new Error('SLUG_NOT_OWNED')
  }

  const next: CustomDomainData = {
    ...domainData,
    defaultSlug: normalizedSlug,
  }

  const pipeline = redis.pipeline()
  pipeline.set(`${CUSTOM_DOMAIN_PREFIX}${normalizedDomain}`, JSON.stringify(next), { ex: 60 * 60 * 24 * 365 })
  pipeline.set(getDomainSlugKey(normalizedDomain), normalizedSlug, { ex: 60 * 60 * 24 * 365 })
  await pipeline.exec()

  return next
}

export async function resolveSlugForHostname(hostname: string, pathname: string): Promise<string | null> {
  const normalizedHost = normalizeDomain(hostname)
  const domainData = await getCustomDomain(normalizedHost)

  if (!domainData || !domainData.active || domainData.status !== 'verified') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) {
    return normalizeSlug(segments[0] || '') || null
  }

  const mappedSlug = await redis.get<string>(getDomainSlugKey(normalizedHost))
  return mappedSlug ? normalizeSlug(mappedSlug) : normalizeSlug(domainData.defaultSlug || '') || null
}
