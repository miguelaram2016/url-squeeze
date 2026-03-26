import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  redis,
  REDIRECT_PREFIX,
  CLICKS_PREFIX,
  INFO_PREFIX,
  CLICK_COUNTRY_PREFIX,
  CLICK_DEVICE_PREFIX,
  CLICK_EVENTS_PREFIX,
  CLICK_REFERRER_PREFIX,
} from '@/lib/redis'
import { getLinkAnalytics } from '@/lib/analytics'
import { cleanupLinkIndexes } from '@/lib/links'

// GET /api/links/[slug] - Get link info and analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const [redirectUrl, info, clicks, analytics] = await Promise.all([
      redis.get<string>(`${REDIRECT_PREFIX}${slug}`),
      redis.hgetall(`${INFO_PREFIX}${slug}`),
      redis.get<number>(`${CLICKS_PREFIX}${slug}`),
      getLinkAnalytics(slug),
    ])

    if (!redirectUrl) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: slug,
      slug,
      url: redirectUrl,
      createdAt: (info?.createdAt as string) || new Date().toISOString(),
      lastClickedAt: analytics.lastClickedAt,
      clicks: clicks || 0,
      analytics,
    })
  } catch (error) {
    console.error('Error fetching link:', error)
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
  }
}

// DELETE /api/links/[slug] - Delete a link owned by the authenticated user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    const ownerId = session?.user?.email?.trim().toLowerCase()

    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const [exists, info] = await Promise.all([
      redis.exists(`${REDIRECT_PREFIX}${slug}`),
      redis.hgetall<Record<string, string>>(`${INFO_PREFIX}${slug}`),
    ])

    if (!exists) {
      await cleanupLinkIndexes(slug, ownerId)
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (!info?.ownerId || info.ownerId !== ownerId) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const pipeline = redis.pipeline()
    pipeline.del(`${REDIRECT_PREFIX}${slug}`)
    pipeline.del(`${INFO_PREFIX}${slug}`)
    pipeline.del(`${CLICKS_PREFIX}${slug}`)
    pipeline.del(`${CLICK_EVENTS_PREFIX}${slug}`)
    pipeline.del(`${CLICK_COUNTRY_PREFIX}${slug}`)
    pipeline.del(`${CLICK_REFERRER_PREFIX}${slug}`)
    pipeline.del(`${CLICK_DEVICE_PREFIX}${slug}`)
    await pipeline.exec()
    await cleanupLinkIndexes(slug, ownerId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting link:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
