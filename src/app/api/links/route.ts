import { NextRequest, NextResponse } from 'next/server'
import { redis, CLICKS_PREFIX, INFO_PREFIX, REDIRECT_PREFIX, SLUG_INDEX } from '@/lib/redis'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { isURLBlocked } from '@/lib/blocklist'
import { getAuthenticatedOwnerId, getLinkRecord, getUserLinksKey, resolveAvailableSlug } from '@/lib/links'

export async function GET() {
  try {
    const ownerId = await getAuthenticatedOwnerId()

    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slugs = await redis.smembers<string[]>(getUserLinksKey(ownerId))

    if (!slugs || slugs.length === 0) {
      return NextResponse.json([])
    }

    const records = await Promise.all(slugs.map((slug) => getLinkRecord(slug)))
    const links = records
      .filter((record): record is NonNullable<typeof record> => Boolean(record && record.ownerId === ownerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map(({ id, slug, url, createdAt, clicks }) => ({ id, slug, url, createdAt, clicks }))

    return NextResponse.json(links)
  } catch (error) {
    console.error('Error fetching links:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const { allowed, remaining, resetAt } = await checkRateLimit(request, ip)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { url, slug: customSlug, splash = true } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const blockResult = isURLBlocked(url)
    if (blockResult.blocked) {
      return NextResponse.json({ error: `This URL cannot be shortened: ${blockResult.reason}` }, { status: 403 })
    }

    const ownerId = await getAuthenticatedOwnerId()
    const slugResult = await resolveAvailableSlug(customSlug)

    if ('error' in slugResult) {
      const status = slugResult.error === 'Slug already taken' ? 409 : 400
      return NextResponse.json({ error: slugResult.error }, { status })
    }

    return createLink(slugResult.slug, url, remaining, splash, ownerId)
  } catch (error) {
    console.error('Error creating link:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}

async function createLink(
  slug: string,
  url: string,
  remaining = 9,
  splash = true,
  ownerId: string | null = null,
) {
  const now = new Date().toISOString()

  const pipeline = redis.pipeline()
  pipeline.set(`${REDIRECT_PREFIX}${slug}`, url)
  pipeline.hset(`${INFO_PREFIX}${slug}`, {
    url,
    slug,
    createdAt: now,
    splash: splash ? '1' : '0',
    ...(ownerId ? { ownerId } : {}),
  })
  pipeline.set(`${CLICKS_PREFIX}${slug}`, 0)
  pipeline.sadd(SLUG_INDEX, slug)

  if (ownerId) {
    pipeline.sadd(getUserLinksKey(ownerId), slug)
  }

  await pipeline.exec()

  return NextResponse.json({
    id: slug,
    slug,
    url,
    splash,
    createdAt: now,
    clicks: 0,
    ownerId,
  }, {
    status: 201,
    headers: {
      'X-RateLimit-Remaining': String(remaining),
    },
  })
}
