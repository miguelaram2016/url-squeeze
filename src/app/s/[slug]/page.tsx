import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Globe, Globe2 } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function StatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const link = await prisma.link.findUnique({
    where: { slug },
    include: { clickRecords: { orderBy: { createdAt: 'desc' } } }
  })
  
  if (!link) notFound()

  // Aggregate stats
  const countryMap: Record<string, number> = {}
  const referrerMap: Record<string, number> = {}
  const deviceMap: Record<string, number> = {}

  for (const click of link.clickRecords) {
    if (click.country) countryMap[click.country] = (countryMap[click.country] || 0) + 1
    const ref = click.referrer || 'Direct'
    referrerMap[ref] = (referrerMap[ref] || 0) + 1
    if (click.userAgent) {
      const ua = click.userAgent.toLowerCase()
      if (ua.includes('mobile') || ua.includes('android')) deviceMap['Mobile'] = (deviceMap['Mobile'] || 0) + 1
      else if (ua.includes('tablet')) deviceMap['Tablet'] = (deviceMap['Tablet'] || 0) + 1
      else deviceMap['Desktop'] = (deviceMap['Desktop'] || 0) + 1
    }
  }

  const sortedCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const sortedReferrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const shortUrl = `${baseUrl}/${slug}`
  const totalClicks = link.clickRecords.length

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold font-mono mb-2">/{slug}</h1>
            <p className="text-muted-foreground text-sm truncate max-w-lg">{link.url}</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {totalClicks} clicks
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{totalClicks}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{Object.keys(countryMap).length}</p>
              <p className="text-xs text-muted-foreground mt-1">Countries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{Object.keys(referrerMap).length}</p>
              <p className="text-xs text-muted-foreground mt-1">Referrers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">
                {link.createdAt.toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Created</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Countries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" /> Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {sortedCountries.map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between">
                      <span className="text-sm">{country}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referrers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe2 className="w-4 h-4" /> Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedReferrers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {sortedReferrers.map(([ref, count]) => (
                    <div key={ref} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[180px]" title={ref}>{ref}</span>
                      <span className="text-sm text-muted-foreground ml-2">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center p-2">
                <img
                  src={`/api/links/${slug}/qr`}
                  alt="QR Code"
                  className="w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Scan to open short link</p>
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 px-3 items-center justify-center rounded-md border border-input bg-background text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Open link
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
