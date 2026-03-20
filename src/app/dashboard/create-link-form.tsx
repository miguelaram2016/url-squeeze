'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function CreateLinkForm() {
  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, slug: slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create link')
        return
      }
      setUrl('')
      setSlug('')
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <Input
        placeholder="https://example.com/long/url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="flex-1 font-mono text-sm"
        required
      />
      <Input
        placeholder="Custom slug (optional)"
        value={slug}
        onChange={e => setSlug(e.target.value)}
        className="sm:w-48 font-mono text-sm"
      />
      <Button type="submit" disabled={loading || !url} className="bg-indigo-500 hover:bg-indigo-600">
        {loading ? 'Creating...' : 'Create'}
      </Button>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </form>
  )
}
