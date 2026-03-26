import { auth } from '@/auth'
import { redis, SLUG_INDEX, getLinkKeys, getUserLinksKey, type LinkInfo } from '@/lib/redis'

const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,64}$/
const AUTO_SLUG_LENGTH = 6
const MAX_AUTO_SLUG_ATTEMPTS = 5

export type LinkRecord = {
  id: string
  slug: string
  url: string
  createdAt: string
  clicks: number
  splash: boolean
  ownerId: string | null
  lastClickedAt: string | null
}

export function normalizeSlug(input: string) {
  return input.trim()
}

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug)
}

export async function getAuthenticatedOwnerId() {
  const session = await auth()
  return session?.user?.email?.trim().toLowerCase() || null
}

export async function slugExists(slug: string) {
  return Boolean(await redis.exists(getLinkKeys(slug).redirect))
}

export async function resolveAvailableSlug(customSlug?: string | null) {
  const normalizedCustomSlug = customSlug ? normalizeSlug(customSlug) : ''

  if (normalizedCustomSlug) {
    if (!isValidSlug(normalizedCustomSlug)) {
      return { error: 'Slug must be 3-64 chars and use only letters, numbers, hyphens, or underscores.' } as const
    }

    if (await slugExists(normalizedCustomSlug)) {
      return { error: 'Slug already taken' } as const
    }

    return { slug: normalizedCustomSlug } as const
  }

  for (let attempt = 0; attempt < MAX_AUTO_SLUG_ATTEMPTS; attempt += 1) {
    const { nanoid } = await import('nanoid')
    const candidate = nanoid(AUTO_SLUG_LENGTH)
    if (!(await slugExists(candidate))) {
      return { slug: candidate } as const
    }
  }

  return { error: 'Could not generate an available slug. Please try again.' } as const
}

export async function getLinkRecord(slug: string): Promise<LinkRecord | null> {
  const { redirect, info, clicks } = getLinkKeys(slug)
  const [redirectUrl, linkInfo, clickCount] = await Promise.all([
    redis.get<string>(redirect),
    redis.hgetall<Record<string, string>>(info),
    redis.get<number>(clicks),
  ])

  if (!redirectUrl) {
    await cleanupLinkIndexes(slug, linkInfo?.ownerId || null)
    return null
  }

  return {
    id: slug,
    slug,
    url: redirectUrl,
    createdAt: linkInfo?.createdAt || new Date().toISOString(),
    clicks: clickCount || 0,
    splash: linkInfo?.splash === '1',
    ownerId: linkInfo?.ownerId || null,
    lastClickedAt: linkInfo?.lastClickedAt || null,
  }
}

export async function cleanupLinkIndexes(slug: string, ownerId?: string | null) {
  const pipeline = redis.pipeline()
  pipeline.srem(SLUG_INDEX, slug)
  if (ownerId) {
    pipeline.srem(getUserLinksKey(ownerId), slug)
  }
  await pipeline.exec()
}

export { getUserLinksKey }
