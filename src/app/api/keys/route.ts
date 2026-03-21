import { NextRequest, NextResponse } from 'next/server'
import { createApiKey, TIER_LIMITS } from '@/lib/api-keys'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'

// POST /api/keys - Generate a new API key
export async function POST(request: NextRequest) {
  try {
    // Rate limit key generation endpoint (IP-based)
    const ip = getClientIP(request)
    const { allowed, remaining, resetAt } = await checkRateLimit(request, ip)

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
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { key, data } = await createApiKey(email, 'free')

    return NextResponse.json(
      {
        key, // Only shown once!
        email: data.email,
        tier: data.tier,
        createdAt: data.createdAt,
        rateLimits: {
          requestsPerDay: TIER_LIMITS.free.requestsPerDay,
          requestsPerMinute: TIER_LIMITS.free.requestsPerMinute,
        },
        message: 'Save this key — it will not be shown again.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }
}
