import { NextRequest, NextResponse } from 'next/server'
import { redis, REDIRECT_PREFIX, INFO_PREFIX } from '@/lib/redis'

// GET /api/splash/[slug] - Get splash page data for a link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const [redirectUrl, info] = await Promise.all([
      redis.get<string>(`${REDIRECT_PREFIX}${slug}`),
      redis.hgetall(`${INFO_PREFIX}${slug}`),
    ])

    if (!redirectUrl) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Check if splash is enabled (default to true if not set)
    const splashEnabled = info?.splash !== '0'

    return NextResponse.json({
      slug,
      url: redirectUrl,
      splash: splashEnabled,
    })
  } catch (error) {
    console.error('Error fetching splash data:', error)
    return NextResponse.json({ error: 'Failed to fetch splash data' }, { status: 500 })
  }
}
