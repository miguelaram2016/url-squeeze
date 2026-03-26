import Image from 'next/image'
import { redis, REDIRECT_PREFIX, CLICKS_PREFIX, INFO_PREFIX } from '@/lib/redis'
import { getLinkAnalytics } from '@/lib/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, MousePointerClick, Globe2, Smartphone, ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function TopList({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: Array<{ label: string; count: number }>
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default async function StatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [url, info, clicks, analytics] = await Promise.all([
    redis.get<string>(`${REDIRECT_PREFIX}${slug}`),
    redis.hgetall(`${INFO_PREFIX}${slug}`),
    redis.get<number>(`${CLICKS_PREFIX}${slug}`),
    getLinkAnalytics(slug),
  ])

  if (!url) notFound()

  const totalClicks = clicks || 0
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const shortUrl = `${baseUrl}/${slug}`

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold font-mono mb-2">/{slug}</h1>
            <p className="text-muted-foreground text-sm break-all max-w-2xl">{url}</p>
          </div>
          <Badge variant="secondary" className="text-sm w-fit">
            {totalClicks} clicks recorded
          </Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <MousePointerClick className="w-4 h-4 mx-auto mb-2 text-indigo-400" />
              <p className="text-3xl font-bold">{totalClicks}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Globe2 className="w-4 h-4 mx-auto mb-2 text-indigo-400" />
              <p className="text-3xl font-bold">{analytics.countries.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Countries Seen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Smartphone className="w-4 h-4 mx-auto mb-2 text-indigo-400" />
              <p className="text-3xl font-bold">{analytics.devices[0]?.label || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Top Device</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm font-semibold truncate">{formatDate(analytics.lastClickedAt || (info?.createdAt as string | undefined))}</p>
              <p className="text-xs text-muted-foreground mt-1">Last Activity</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          <TopList title="Top countries" empty="No location data yet." items={analytics.countries} />
          <TopList title="Traffic sources" empty="No referrers yet. Direct visits will appear here too." items={analytics.referrers} />
          <TopList title="Devices" empty="No device breakdown yet." items={analytics.devices} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent click events</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentClicks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No click events recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.recentClicks.map((event) => (
                    <div key={`${event.timestamp}-${event.referrer}-${event.device}`} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline">{event.country}</Badge>
                        <Badge variant="outline">{event.device}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">Source: {event.referrer}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Link assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center p-2">
                  <Image
                    src={`/api/links/${slug}/qr`}
                    alt="QR Code"
                    width={128}
                    height={128}
                    unoptimized
                    className="w-full h-full"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Scan or share the short link.</p>
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 px-3 items-center justify-center rounded-md border border-input bg-background text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" /> Open link
                  </a>
                  <p className="text-xs text-muted-foreground break-all">Created {formatDate(info?.createdAt as string | undefined)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Analytics shown here come from real redirect events: timestamp, referrer hostname, country lookup, and device classification.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
