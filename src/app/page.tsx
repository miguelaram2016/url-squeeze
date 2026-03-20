'use client'

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

      // Fetch QR code
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo / Brand */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">URL Squeeze</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Short links with<br />
            <span className="text-indigo-400">serious analytics</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Paste a long URL. Get a short one. Know who&apos;s clicking.
          </p>
        </div>

        {/* Input Card */}
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
                {loading ? (
                  <span className="animate-pulse">Shortening...</span>
                ) : (
                  'Shorten'
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-500 mt-3">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className="mb-6 border-indigo-500/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Your short link</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-8 gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="font-mono text-lg mb-4 break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/${result.slug}` : `/${result.slug}`}
              </p>
              {qrDataUrl && (
                <div className="flex items-center gap-4">
                  <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 rounded-lg border" />
                  <div className="text-sm text-muted-foreground">
                    <p>Scan to open</p>
                    <a
                      href={`/s/${result.slug}`}
                      className="text-indigo-400 hover:underline mt-1 inline-block"
                    >
                      View stats →
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent links */}
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
                  <Button variant="ghost" size="sm" className="h-7" asChild>
                    <Link href={`/s/${link.slug}`}>Stats</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard link */}
        <div className="text-center mt-8">
          <Button variant="link" asChild className="text-muted-foreground text-sm">
            <Link href="/dashboard">Open dashboard →</Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-muted-foreground">
        <span>URL Squeeze · No signup required</span>
      </footer>
    </main>
  )
}
