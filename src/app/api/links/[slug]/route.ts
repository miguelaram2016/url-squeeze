import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  
  const link = await prisma.link.findUnique({
    where: { slug },
    include: {
      clicks: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      }
    }
  })
  
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  const countryStats = {} as Record<string, number>
  const referrerStats = {} as Record<string, number>
  const deviceStats = {} as Record<string, number>
  
  for (const click of link.clicks) {
    if (click.country) countryStats[click.country] = (countryStats[click.country] || 0) + 1
    if (click.referrer) referrerStats[click.referrer] = (referrerStats[click.referrer] || 0) + 1
    if (click.userAgent) {
      const ua = click.userAgent.toLowerCase()
      if (ua.includes('mobile') || ua.includes('android')) deviceStats['Mobile'] = (deviceStats['Mobile'] || 0) + 1
      else if (ua.includes('tablet') || ua.includes('ipad')) deviceStats['Tablet'] = (deviceStats['Tablet'] || 0) + 1
      else deviceStats['Desktop'] = (deviceStats['Desktop'] || 0) + 1
    }
  }
  
  return NextResponse.json({
    slug: link.slug,
    url: link.url,
    clicks: link.clicks,
    clickRecords: link.clickRecords.length,
    createdAt: link.createdAt,
    active: link.active,
    stats: {
      countries: countryStats,
      referrers: referrerStats,
      devices: deviceStats,
    }
  })
}
