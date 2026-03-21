import { redis, REDIRECT_PREFIX, CLICKS_PREFIX, INFO_PREFIX } from '@/lib/redis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Globe, Globe2 } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function StatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Get link info and click count from Redis
  const [url, info, clicks] = await Promise.all([
    redis.get<string>(`${REDIRECT_PREFIX}${slug}`),
    redis.hgetall(`${INFO_PREFIX}${slug}`),
    redis.get<number>(`${CLICKS_PREFIX}${slug}`),
  ])

  if (!url) notFound()

  const totalClicks = clicks || 0
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const shortUrl = `${baseUrl}/${slug}`

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold font-mono mb-2">/{slug}</h1>
            <p className="text-muted-foreground text-sm truncate max-w-lg">{url}</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {totalClicks} clicks
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{totalClicks}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">1</p>
              <p className="text-xs text-muted-foreground mt-1">Countries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">
                {info?.createdAt ? new Date(info.createdAt as string).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Created</p>
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
