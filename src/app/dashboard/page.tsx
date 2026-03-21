import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { redis, REDIRECT_PREFIX, CLICKS_PREFIX, INFO_PREFIX, SLUG_INDEX } from '@/lib/redis'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, ExternalLink, Plus, QrCode } from 'lucide-react'
import DeleteLinkButton from './delete-button'
import CreateLinkForm from './create-link-form'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  // Get all links from Redis
  const slugs = await redis.smembers(SLUG_INDEX)
  
  const links = await Promise.all(
    slugs.slice(-50).reverse().map(async (slug) => {
      const info = await redis.hgetall(`${INFO_PREFIX}${slug}`)
      const clicks = await redis.get<number>(`${CLICKS_PREFIX}${slug}`)
      return {
        id: slug,
        slug,
        url: (info?.url as string) || '',
        createdAt: (info?.createdAt as string) || new Date().toISOString(),
        clicks: clicks || 0,
      }
    })
  )

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {links.length} total links
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">← Shorten new link</Button>
            </Link>
          </div>
        </div>

        {/* Create link form */}
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

        {/* Links list - responsive: table on desktop, cards on mobile */}
        {links.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No links yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create one above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Desktop table */}
            <Card className="hidden md:block overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Original URL</th>
                      <th className="px-4 py-3 font-medium text-center">Clicks</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(link => (
                      <tr key={link.id} className="border-b last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-indigo-400">
                            /{link.slug}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm truncate max-w-[300px] inline-block text-muted-foreground">
                            {link.url}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium">{link.clicks}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </td>
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
                              title="View stats & QR code"
                            >
                              <QrCode className="w-3 h-3" />
                            </Link>
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

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {links.map(link => (
                <Card key={link.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-sm text-indigo-400">
                        /{link.slug}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {link.clicks} clicks
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-3">
                      {link.url}
                    </p>
                    <div className="flex items-center gap-2">
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
                        <QrCode className="w-3 h-3 mr-1" /> QR
                      </Link>
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
      </div>
    </main>
  )
}
