import { NextRequest, NextResponse } from 'next/server'
import { redis, REDIRECT_PREFIX, CLICKS_PREFIX, INFO_PREFIX } from '@/lib/redis'

// GET /api/links/[slug] - Get link info and stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const [redirectUrl, info, clicks] = await Promise.all([
      redis.get<string>(`${REDIRECT_PREFIX}${slug}`),
      redis.hgetall(`${INFO_PREFIX}${slug}`),
      redis.get<number>(`${CLICKS_PREFIX}${slug}`),
    ])

    if (!redirectUrl) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: slug,
      slug,
      url: redirectUrl,
      createdAt: (info?.createdAt as string) || new Date().toISOString(),
      clicks: clicks || 0,
    })
  } catch (error) {
    console.error('Error fetching link:', error)
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
  }
}

// DELETE /api/links/[slug] - Delete a link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Check if link exists
    const exists = await redis.exists(`${REDIRECT_PREFIX}${slug}`)
    if (!exists) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Delete all related keys
    await Promise.all([
      redis.del(`${REDIRECT_PREFIX}${slug}`),
      redis.del(`${INFO_PREFIX}${slug}`),
      redis.del(`${CLICKS_PREFIX}${slug}`),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting link:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
