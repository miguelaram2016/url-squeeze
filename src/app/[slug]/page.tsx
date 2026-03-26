import { redis, getLinkKeys } from '@/lib/redis'
import { recordClickEvent } from '@/lib/analytics'
import { resolveSlugForHostname } from '@/lib/custom-domains'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

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
  const { slug: routeSlug } = await params
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || ''
  const pathname = h.get('x-invoke-path') || `/${routeSlug}`
  const resolvedSlug = await resolveSlugForHostname(host, pathname) || routeSlug
  const { redirect: redirectKey, clicks: clicksKey } = getLinkKeys(resolvedSlug)
  const url = await redis.get<string>(redirectKey)

  if (!url) {
    redirect('/')
  }

  const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown'
  const country = getCountry(ip)
  const referrer = h.get('referer')
  const userAgent = h.get('user-agent')

  await Promise.all([
    redis.incr(clicksKey),
    recordClickEvent(resolvedSlug, { country, referrer, userAgent }),
  ])

  redirect(url)
}
