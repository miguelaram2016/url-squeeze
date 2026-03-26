import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedOwnerId } from '@/lib/dashboard-auth'
import { claimLegacyLinks } from '@/lib/legacy-links'

export async function POST(request: NextRequest) {
  try {
    const ownerId = await requireAuthenticatedOwnerId()
    const body = await request.json().catch(() => ({}))
    const rawSlugs = Array.isArray(body.slugs)
      ? body.slugs
      : typeof body.slugs === 'string'
        ? body.slugs.split(/[\s,\n]+/)
        : []

    if (rawSlugs.length === 0) {
      return NextResponse.json({ error: 'At least one slug is required.' }, { status: 400 })
    }

    const result = await claimLegacyLinks(ownerId, rawSlugs)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error claiming legacy links:', error)
    return NextResponse.json({ error: 'Failed to claim legacy links' }, { status: 500 })
  }
}
