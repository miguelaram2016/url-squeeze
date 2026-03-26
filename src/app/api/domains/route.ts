import { NextRequest, NextResponse } from 'next/server'
import {
  getDomainVerificationInstructions,
  listCustomDomains,
  registerCustomDomain,
  removeCustomDomain,
  verifyCustomDomain,
} from '@/lib/custom-domains'
import { extractApiKey, validateApiKey } from '@/lib/api-keys'
import { requireAuthenticatedOwnerId } from '@/lib/dashboard-auth'

async function getOwnerId(request: NextRequest) {
  const sessionOwnerId = await requireAuthenticatedOwnerId().catch(() => null)
  if (sessionOwnerId) return sessionOwnerId

  const apiKey = extractApiKey(request)
  if (!apiKey) return null

  const keyData = await validateApiKey(apiKey)
  return keyData?.email || null
}

// POST /api/domains - Register a custom domain
export async function POST(request: NextRequest) {
  try {
    const ownerId = await getOwnerId(request)
    if (!ownerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { domain, brandName } = body

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    if (!brandName || typeof brandName !== 'string') {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    const data = await registerCustomDomain(domain, brandName, ownerId)

    return NextResponse.json({
      message: data.status === 'verified' ? 'Custom domain ready' : 'Custom domain added. Finish DNS setup, then verify it.',
      domain: data,
      dnsInstructions: getDomainVerificationInstructions(data.domain),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'DOMAIN_TAKEN') {
      return NextResponse.json({ error: 'That domain is already claimed by another account.' }, { status: 409 })
    }

    console.error('Error registering custom domain:', error)
    return NextResponse.json({ error: 'Failed to register domain' }, { status: 500 })
  }
}

// GET /api/domains - List custom domains for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const ownerId = await getOwnerId(request)
    if (!ownerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const verifyDomain = new URL(request.url).searchParams.get('verify')
    if (verifyDomain) {
      const domain = await verifyCustomDomain(verifyDomain, ownerId)
      if (!domain) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
      }

      return NextResponse.json({ domain, dnsInstructions: getDomainVerificationInstructions(domain.domain) })
    }

    const domains = await listCustomDomains(ownerId)

    return NextResponse.json({ domains })
  } catch (error) {
    console.error('Error listing custom domains:', error)
    return NextResponse.json({ error: 'Failed to list domains' }, { status: 500 })
  }
}

// DELETE /api/domains?domain=example.com - Remove a custom domain
export async function DELETE(request: NextRequest) {
  try {
    const ownerId = await getOwnerId(request)
    if (!ownerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter required' }, { status: 400 })
    }

    const removed = await removeCustomDomain(domain, ownerId)

    if (!removed) {
      return NextResponse.json({ error: 'Domain not found or not owned by you' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Domain removed' })
  } catch (error) {
    console.error('Error removing custom domain:', error)
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
  }
}
