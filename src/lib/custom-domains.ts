import { redis } from './redis'

export const CUSTOM_DOMAIN_PREFIX = 'customdomain:'

export interface CustomDomainData {
  domain: string
  brandName: string
  ownerEmail: string
  createdAt: string
  active: boolean
  status: 'pending' | 'verified'
  verificationTarget: string
  verifiedAt?: string
}

const DEFAULT_VERIFICATION_TARGET = process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'cname.url-squeeze.vercel.app'

function normalizeDomain(domain: string) {
  return domain.toLowerCase().trim()
}

function getOwnerDomainsKey(ownerEmail: string) {
  return `customdomain:owner:${ownerEmail}`
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

  await redis.del(`${CUSTOM_DOMAIN_PREFIX}${normalized}`)
  await redis.srem(getOwnerDomainsKey(ownerEmail), normalized)

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
