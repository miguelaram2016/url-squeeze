import { NextRequest, NextResponse } from 'next/server'
import { registerCustomDomain, listCustomDomains, removeCustomDomain } from '@/lib/custom-domains'
import { extractApiKey, validateApiKey } from '@/lib/api-keys'

// POST /api/domains - Register a custom domain
export async function POST(request: NextRequest) {
  try {
    // API key auth required
    const apiKey = extractApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    const keyData = await validateApiKey(apiKey)
    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
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

    const data = await registerCustomDomain(domain, brandName, keyData.email)

    return NextResponse.json({
      message: 'Custom domain registered',
      domain: data,
      dnsInstructions: {
        type: 'CNAME',
        name: 'links',
        value: 'cname.url-squeeze.vercel.app',
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error registering custom domain:', error)
    return NextResponse.json({ error: 'Failed to register domain' }, { status: 500 })
  }
}

// GET /api/domains - List custom domains for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    const keyData = await validateApiKey(apiKey)
    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const domains = await listCustomDomains(keyData.email)

    return NextResponse.json({ domains })
  } catch (error) {
    console.error('Error listing custom domains:', error)
    return NextResponse.json({ error: 'Failed to list domains' }, { status: 500 })
  }
}

// DELETE /api/domains?domain=example.com - Remove a custom domain
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    const keyData = await validateApiKey(apiKey)
    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter required' }, { status: 400 })
    }

    const removed = await removeCustomDomain(domain, keyData.email)

    if (!removed) {
      return NextResponse.json({ error: 'Domain not found or not owned by you' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Domain removed' })
  } catch (error) {
    console.error('Error removing custom domain:', error)
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
  }
}
