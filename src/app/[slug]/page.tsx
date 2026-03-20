import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import geoip from 'geoip-lite'

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
    const geo = geoip.lookup(ip.replace(/,.*$/, ''))
    if (geo && geo.country) country = geo.country
  } catch {}
  
  await prisma.click.create({
    data: { linkId: link.id, ip, referrer: referer, userAgent, country }
  })
  
  redirect(link.url)
}
