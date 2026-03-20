import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Force dynamic - geoip-lite doesn't work with static generation
export const dynamic = 'force-dynamic'

// Lazy load geoip only on-demand (for production builds)
function getCountry(ip: string): string | null {
  try {
    // Dynamic import to avoid build-time issues
    const geoip = require('geoip-lite')
    const geo = geoip.lookup(ip.replace(/,.*$/, ''))
    return geo?.country || null
  } catch {
    return null
  }
}

export default async function RedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const link = await prisma.link.findUnique({ where: { slug } })
  
  if (!link || !link.active) {
    redirect('/')
  }
  
  // Record click
  const h = await headers()
  const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown'
  const referer = h.get('referer') || ''
  const userAgent = h.get('user-agent') || ''
  
  let country: string | null = null
  try {
    country = getCountry(ip)
  } catch {}
  
  await prisma.click.create({
    data: { linkId: link.id, ip, referrer: referer, userAgent, country }
  })
  
  redirect(link.url)
}
