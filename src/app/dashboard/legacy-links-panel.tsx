'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatabaseZap } from 'lucide-react'

interface ClaimResult {
  slug: string
  status: 'claimed' | 'already-owned' | 'missing' | 'owned-by-someone-else'
}

export default function LegacyLinksPanel() {
  const [slugs, setSlugs] = useState('')
  const [results, setResults] = useState<ClaimResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const claim = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/links/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim links')
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim links')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DatabaseZap className="w-4 h-4" /> Legacy link claim
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
          Policy: you can claim old links only when they have no owner yet. If a link is already attached to someone else, this tool refuses to touch it.
        </div>

        <textarea
          value={slugs}
          onChange={(event) => setSlugs(event.target.value)}
          placeholder={'Paste slugs separated by commas, spaces, or new lines\nexample-one\nlegacy-campaign'}
          className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <Button onClick={claim} disabled={loading}>
          {loading ? 'Claiming…' : 'Claim links'}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((item) => (
              <div key={`${item.slug}-${item.status}`} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="font-mono">/{item.slug}</span>
                <span className="text-muted-foreground">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
