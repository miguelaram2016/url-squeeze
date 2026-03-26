'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Copy, Globe, LoaderCircle, Trash2 } from 'lucide-react'

interface DomainRow {
  domain: string
  brandName: string
  status: 'pending' | 'verified'
  verificationTarget: string
  createdAt: string
  verifiedAt?: string
}

export default function CustomDomainsPanel() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [domain, setDomain] = useState('')
  const [brandName, setBrandName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/domains')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load domains')
      setDomains(data.domains || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const addDomain = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, brandName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add domain')
      setDomain('')
      setBrandName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain')
    } finally {
      setSaving(false)
    }
  }

  const verify = async (hostname: string) => {
    setVerifyingDomain(hostname)
    setError('')
    try {
      const res = await fetch(`/api/domains?verify=${encodeURIComponent(hostname)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to verify domain')
      setDomains((prev) => prev.map((item) => item.domain === hostname ? data.domain : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify domain')
    } finally {
      setVerifyingDomain(null)
    }
  }

  const remove = async (hostname: string) => {
    setError('')
    const res = await fetch(`/api/domains?domain=${encodeURIComponent(hostname)}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to remove domain')
      return
    }
    setDomains((prev) => prev.filter((item) => item.domain !== hostname))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4" /> Custom domains
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto]">
          <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="go.example.com" />
          <Input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Brand name" />
          <Button onClick={addDomain} disabled={saving}>
            {saving ? 'Adding…' : 'Add domain'}
          </Button>
        </div>

        <div className="rounded-lg border p-3 text-sm text-muted-foreground space-y-2">
          <p>Use a dedicated subdomain like <code>go.example.com</code>. Apex/root domains are a pain and not worth the support burden here.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span>DNS target:</span>
            <code className="rounded bg-black/20 px-2 py-1 text-xs">cname.url-squeeze.vercel.app</code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText('cname.url-squeeze.vercel.app')}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading domains…</p>
        ) : domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom domains yet.</p>
        ) : (
          <div className="space-y-3">
            {domains.map((item) => (
              <div key={item.domain} className="rounded-lg border p-3 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{item.domain}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.brandName} · {item.status === 'verified' ? 'verified' : 'pending DNS verification'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => verify(item.domain)} disabled={verifyingDomain === item.domain}>
                      {verifyingDomain === item.domain ? <LoaderCircle className="w-3 h-3 mr-1 animate-spin" /> : item.status === 'verified' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
                      {item.status === 'verified' ? 'Re-check' : 'Verify'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(item.domain)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
                <div className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <p>Point <strong>{item.domain}</strong> to <code>{item.verificationTarget}</code> with a CNAME record, then hit Verify.</p>
                  {item.verifiedAt && <p className="mt-1">Verified at {new Date(item.verifiedAt).toLocaleString()}.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
