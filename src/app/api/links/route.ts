import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { redis, REDIRECT_PREFIX, CLICKS_PREFIX, INFO_PREFIX, SLUG_INDEX, USER_LINKS_PREFIX } from '@/lib/redis'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { isURLBlocked } from '@/lib/blocklist'

// GET /api/links - List all links for a user (or recent if not authenticated)
export async function GET(request: NextRequest) {
  try {
    // For now, return recent links from the index
    // In production, you'd filter by userId for authenticated requests
    const slugs = await redis.smembers(SLUG_INDEX)
    
    if (!slugs || slugs.length === 0) {
      return NextResponse.json([])
    }

    // Get info for each slug (most recent first, limit 50)
    const links = await Promise.all(
      slugs.slice(-50).reverse().map(async (slug) => {
        const info = await redis.hgetall(`${INFO_PREFIX}${slug}`)
        const clicks = await redis.get<number>(`${CLICKS_PREFIX}${slug}`)
        return {
          id: slug,
          slug,
          url: (info?.url as string) || '',
          createdAt: (info?.createdAt as string) || new Date().toISOString(),
          clicks: clicks || 0,
        }
      })
    )

    return NextResponse.json(links)
  } catch (error) {
    console.error('Error fetching links:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

// POST /api/links - Create a new short link (public, rate-limited)
export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const ip = getClientIP(request)
    const { allowed, remaining, resetAt } = await checkRateLimit(ip)
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { url, slug: customSlug } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Check blocklist
    const blockResult = isURLBlocked(url)
    if (blockResult.blocked) {
      return NextResponse.json({ error: `This URL cannot be shortened: ${blockResult.reason}` }, { status: 403 })
    }

    // Generate slug (6 chars for better monetization potential)
    const slug = customSlug || nanoid(6)

    // Check if slug already exists
    const existing = await redis.exists(`${REDIRECT_PREFIX}${slug}`)
    if (existing) {
      if (customSlug) {
        return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
      }
      // If auto-generated slug conflicts, try again with a new one
      const newSlug = nanoid(6)
      return createLink(newSlug, url, remaining)
    }

    return createLink(slug, url, remaining)
  } catch (error) {
    console.error('Error creating link:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}

async function createLink(slug: string, url: string, remaining: number = 9) {
  const now = new Date().toISOString()
  
  // Store the redirect URL
  await redis.set(`${REDIRECT_PREFIX}${slug}`, url)
  
  // Store link info
  await redis.hset(`${INFO_PREFIX}${slug}`, {
    url,
    slug,
    createdAt: now,
  })
  
  // Initialize click count
  await redis.set(`${CLICKS_PREFIX}${slug}`, 0)
  
  // Add to global slug index
  await redis.sadd(SLUG_INDEX, slug)

  return NextResponse.json({
    id: slug,
    slug,
    url,
    createdAt: now,
    clicks: 0,
  }, { 
    status: 201,
    headers: {
      'X-RateLimit-Remaining': String(remaining),
    }
  })
}
