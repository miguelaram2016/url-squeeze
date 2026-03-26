import { redis, INFO_PREFIX, REDIRECT_PREFIX } from '@/lib/redis'
import { getUserLinksKey } from '@/lib/links'

function normalizeClaimedSlugs(input: string[]) {
  return Array.from(new Set(input.map((slug) => slug.trim()).filter(Boolean)))
}

export async function claimLegacyLinks(ownerId: string, rawSlugs: string[]) {
  const slugs = normalizeClaimedSlugs(rawSlugs)

  const results = await Promise.all(
    slugs.map(async (slug) => {
      const [exists, info] = await Promise.all([
        redis.exists(`${REDIRECT_PREFIX}${slug}`),
        redis.hgetall<Record<string, string>>(`${INFO_PREFIX}${slug}`),
      ])

      if (!exists) {
        return { slug, status: 'missing' as const }
      }

      if (info?.ownerId && info.ownerId !== ownerId) {
        return { slug, status: 'owned-by-someone-else' as const }
      }

      if (info?.ownerId === ownerId) {
        await redis.sadd(getUserLinksKey(ownerId), slug)
        return { slug, status: 'already-owned' as const }
      }

      await redis.hset(`${INFO_PREFIX}${slug}`, {
        ...(info || {}),
        ownerId,
        claimedAt: new Date().toISOString(),
      })
      await redis.sadd(getUserLinksKey(ownerId), slug)

      return { slug, status: 'claimed' as const }
    })
  )

  return {
    results,
    summary: {
      claimed: results.filter((item) => item.status === 'claimed').length,
      alreadyOwned: results.filter((item) => item.status === 'already-owned').length,
      missing: results.filter((item) => item.status === 'missing').length,
      blocked: results.filter((item) => item.status === 'owned-by-someone-else').length,
    },
  }
}
