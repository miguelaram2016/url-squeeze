'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, Link2 } from 'lucide-react'

interface RecentLink {
  slug: string
  url: string
}

const featureNotes = [
  'Live click tracking: timestamp, country, referrer host, and device class.',
  'Affiliate IDs auto-apply only when matching env vars are configured.',
  'Signed-in dashboard now covers API keys, domain setup, and claiming old unowned links.',
  'Splash / interstitial support is stored at the data layer but not promoted until the UX is real.',
]

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([])
  const [qrDataUrl, setQrDataUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleShorten = async () => {
    if (!url) return
    setLoading(true)
    setError('')
    setResult(null)
    setQrDataUrl('')

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to shorten')
        return
      }
      setResult({ slug: data.slug, url: data.url })
      setRecentLinks(prev => [{ slug: data.slug, url: data.url }, ...prev].slice(0, 5))

      const qrRes = await fetch(`/api/links/${data.slug}/qr`)
      const qrData = await qrRes.json()
      if (qrData.qr) setQrDataUrl(qrData.qr)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    const shortUrl = `${window.location.origin}/${result?.slug}`
    await navigator.clipboard.writeText(shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleShorten()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">URL Squeeze</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Short links with<br />
            <span className="text-indigo-400">honest click analytics</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Paste a long URL, get a short one, and see real click events instead of fake dashboard filler.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                placeholder="https://example.com/your/very/long/url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-base h-12 font-mono"
                autoFocus
              />
              <Button
                onClick={handleShorten}
                disabled={loading || !url}
                className="h-12 px-6 bg-indigo-500 hover:bg-indigo-600"
                size="lg"
              >
                {loading ? <span className="animate-pulse">Shortening...</span> : 'Shorten'}
              </Button>
            </div>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card className="mb-6 border-indigo-500/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Your short link</span>
                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="font-mono text-lg mb-4 break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/${result.slug}` : `/${result.slug}`}
              </p>
              {qrDataUrl && (
                <div className="flex items-center gap-4">
                  <Image src={qrDataUrl} alt="QR Code" width={96} height={96} unoptimized className="w-24 h-24 rounded-lg border" />
                  <div className="text-sm text-muted-foreground">
                    <p>Scan to open</p>
                    <a href={`/s/${result.slug}`} className="text-indigo-400 hover:underline mt-1 inline-block">
                      View stats →
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-dashed">
          <CardContent className="p-5 grid gap-2 text-sm text-muted-foreground">
            {featureNotes.map((note) => (
              <p key={note}>• {note}</p>
            ))}
          </CardContent>
        </Card>

        {recentLinks.length > 0 && !result && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Recent this session</p>
            {recentLinks.map(link => (
              <div key={link.slug} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border">
                <span className="font-mono text-sm truncate max-w-xs">{link.slug}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7">
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  <Link href={`/s/${link.slug}`} className="inline-flex h-7 items-center px-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    Stats
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-8 flex items-center justify-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            Open dashboard →
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-xs text-muted-foreground text-center">
        <span>URL Squeeze · No signup required for shortening · Sign in for owned dashboard links</span>
      </footer>
    </main>
  )
}
