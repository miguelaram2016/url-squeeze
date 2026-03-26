import { redis, getLinkKeys } from '@/lib/redis'
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
  const { slug } = await params
  const { redirect: redirectKey, clicks: clicksKey } = getLinkKeys(slug)
  const url = await redis.get<string>(redirectKey)

  if (!url) {
    redirect('/')
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown'
  getCountry(ip)

  await redis.incr(clicksKey)

  redirect(url)
}
