import { NextRequest, NextResponse } from 'next/server'
import { createApiKey, listApiKeys, revokeApiKey, TIER_LIMITS } from '@/lib/api-keys'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { requireAuthenticatedOwnerId } from '@/lib/dashboard-auth'

// POST /api/keys - Generate a new API key
export async function POST(request: NextRequest) {
  try {
    // Rate limit key generation endpoint (IP-based)
    const ip = getClientIP(request)
    const { allowed, resetAt } = await checkRateLimit(request, ip)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
        }
      )
    }

    const body = await request.json().catch(() => ({}))
    const ownerId = await requireAuthenticatedOwnerId().catch(() => null)
    const email = (ownerId || body.email || '').trim().toLowerCase()
    const label = typeof body.label === 'string' ? body.label : null

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { key, data } = await createApiKey(email, 'free', label)

    return NextResponse.json(
      {
        key,
        email: data.email,
        label: data.label || null,
        tier: data.tier,
        createdAt: data.createdAt,
        rateLimits: {
          requestsPerDay: TIER_LIMITS.free.requestsPerDay,
          requestsPerMinute: TIER_LIMITS.free.requestsPerMinute,
        },
        message: 'Save this key now. After this response it is only shown as a masked value.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const ownerId = await requireAuthenticatedOwnerId()
    const keys = await listApiKeys(ownerId)

    return NextResponse.json({ keys })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error listing API keys:', error)
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ownerId = await requireAuthenticatedOwnerId()
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('keyId')

    if (!keyId) {
      return NextResponse.json({ error: 'keyId parameter required' }, { status: 400 })
    }

    const revoked = await revokeApiKey(ownerId, keyId)

    if (!revoked) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error revoking API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
