'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, KeyRound, Trash2 } from 'lucide-react'

interface ApiKeyRow {
  keyId: string
  maskedKey: string
  label: string | null
  tier: 'free' | 'pro'
  createdAt: string
  lastFour: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [freshKey, setFreshKey] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/keys')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load API keys')
      setKeys(data.keys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createKey = async () => {
    setSaving(true)
    setError('')
    setFreshKey(null)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create key')
      setFreshKey(data.key)
      setLabel('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setSaving(false)
    }
  }

  const revokeKey = async (keyId: string) => {
    setError('')
    const res = await fetch(`/api/keys?keyId=${encodeURIComponent(keyId)}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to revoke key')
      return
    }
    setKeys((prev) => prev.filter((item) => item.keyId !== keyId))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> API keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Label (optional) — e.g. Zapier, production site"
            maxLength={64}
          />
          <Button onClick={createKey} disabled={saving} className="md:w-auto w-full">
            {saving ? 'Creating…' : 'Create key'}
          </Button>
        </div>

        {freshKey && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <p className="font-medium mb-2">Copy this now. It will only be shown once.</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <code className="rounded bg-black/20 px-3 py-2 text-xs break-all">{freshKey}</code>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(freshKey)}>
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
          Use one key per integration. If something leaks, revoke that key instead of breaking everything.
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.keyId} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-mono text-sm">{key.maskedKey}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {key.label || 'Unlabeled key'} · {key.tier} tier · created {formatDate(key.createdAt)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeKey(key.keyId)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
