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

      // A publicly visible slug is not proof of ownership. Preserve unowned
      // mappings until a separate, verified migration process is available.
      if (!info?.ownerId) {
        return { slug, status: 'verification-required' as const }
      }

      if (info.ownerId !== ownerId) {
        return { slug, status: 'owned-by-someone-else' as const }
      }

      // Rebuild the dashboard index only after confirming recorded ownership.
      await redis.sadd(getUserLinksKey(ownerId), slug)
      return { slug, status: 'already-owned' as const }
    })
  )

  return {
    results,
    summary: {
      claimed: 0, // Kept for existing API consumers; self-service claiming is disabled.
      requiresVerification: results.filter((item) => item.status === 'verification-required').length,
      alreadyOwned: results.filter((item) => item.status === 'already-owned').length,
      missing: results.filter((item) => item.status === 'missing').length,
      blocked: results.filter((item) => item.status === 'owned-by-someone-else').length,
    },
  }
}
