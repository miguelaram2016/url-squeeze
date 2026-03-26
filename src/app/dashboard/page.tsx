import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, MousePointerClick, Plus, TimerReset } from 'lucide-react'
import QRModal from './qr-modal'
import DeleteLinkButton from './delete-button'
import CreateLinkForm from './create-link-form'
import ApiKeysPanel from './api-keys-panel'
import CustomDomainsPanel from './custom-domains-panel'
import LegacyLinksPanel from './legacy-links-panel'
import { getAuthenticatedOwnerId, getLinkRecord, getUserLinksKey } from '@/lib/links'
import { redis } from '@/lib/redis'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  const ownerId = await getAuthenticatedOwnerId()
  const slugs = ownerId ? await redis.smembers<string[]>(getUserLinksKey(ownerId)) : []

  const links = (await Promise.all((slugs || []).map((slug) => getLinkRecord(slug))))
    .filter((record): record is NonNullable<typeof record> => Boolean(record && record.ownerId === ownerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0)
  const activeLinks = links.filter((link) => link.clicks > 0).length
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Authenticated links only. Click totals come from live redirect events.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">← Shorten new link</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Links</p>
              <p className="text-3xl font-bold">{links.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MousePointerClick className="w-4 h-4" />
                <p className="text-xs uppercase tracking-wide">Total clicks</p>
              </div>
              <p className="text-3xl font-bold">{totalClicks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TimerReset className="w-4 h-4" />
                <p className="text-xs uppercase tracking-wide">Active links</p>
              </div>
              <p className="text-3xl font-bold">{activeLinks}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create new link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLinkForm />
          </CardContent>
        </Card>

        {links.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No links yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create one above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mb-8">
            <Card className="hidden md:block overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Original URL</th>
                      <th className="px-4 py-3 font-medium text-center">Clicks</th>
                      <th className="px-4 py-3 font-medium">Last Click</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr key={link.id} className="border-b last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-indigo-400">/{link.slug}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm truncate max-w-[260px] inline-block text-muted-foreground">{link.url}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{link.clicks}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(link.lastClickedAt)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(link.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`${baseUrl}/${link.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Open short link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <Link
                              href={`/s/${link.slug}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Open stats"
                            >
                              <MousePointerClick className="w-3 h-3" />
                            </Link>
                            <QRModal slug={link.slug} url={link.url} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Copy short link"
                              onClick={() => {
                                navigator.clipboard.writeText(`${baseUrl}/${link.slug}`)
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <DeleteLinkButton linkId={link.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="md:hidden space-y-3">
              {links.map((link) => (
                <Card key={link.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <span className="font-mono text-sm text-indigo-400">/{link.slug}</span>
                      <Badge variant="secondary">{link.clicks} clicks</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{link.url}</p>
                    <p className="text-xs text-muted-foreground mb-3">Last click: {formatDate(link.lastClickedAt)}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`${baseUrl}/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 px-3 items-center justify-center rounded-md border border-input bg-background text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Open
                      </a>
                      <Link
                        href={`/s/${link.slug}`}
                        className="inline-flex h-8 px-3 items-center justify-center rounded-md border border-input bg-background text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        <MousePointerClick className="w-3 h-3 mr-1" /> Stats
                      </Link>
                      <QRModal slug={link.slug} url={link.url} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(`${baseUrl}/${link.slug}`)
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                      <DeleteLinkButton linkId={link.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <ApiKeysPanel />
          <CustomDomainsPanel />
        </div>

        <div className="mt-6">
          <LegacyLinksPanel />
        </div>
      </div>
    </main>
  )
}
