import { redis, REDIRECT_PREFIX, CLICKS_PREFIX } from '@/lib/redis'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Force dynamic - geoip-lite doesn't work with static generation
export const dynamic = 'force-dynamic'

// Lazy load geoip only on-demand
function getCountry(ip: string): string | null {
  try {
    const geoip = require('geoip-lite')
    const geo = geoip.lookup(ip.replace(/,.*$/, ''))
    return geo?.country || null
  } catch {
    return null
  }
}

export default async function RedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // Look up the redirect URL
  const url = await redis.get<string>(`${REDIRECT_PREFIX}${slug}`)
  
  if (!url) {
    redirect('/')
  }
  
  // Record click - increment counter and store click info
  const h = await headers()
  const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown'
  const referer = h.get('referer') || ''
  const userAgent = h.get('user-agent') || ''
  
  let country: string | null = null
  try {
    country = getCountry(ip)
  } catch {}
  
  // Increment click count
  await redis.incr(`${CLICKS_PREFIX}${slug}`)
  
  // TODO: Store click details (referrer, country, userAgent) if needed
  // For now, just increment the counter. Full click log can be added later.
  
  redirect(url)
}
