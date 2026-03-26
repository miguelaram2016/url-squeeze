import { beforeEach, describe, expect, it, vi } from 'vitest'

const pipeline = {
  set: vi.fn(),
  hset: vi.fn(),
  sadd: vi.fn(),
  exec: vi.fn(),
}
const redisMock = {
  pipeline: vi.fn(() => pipeline),
}
const checkRateLimitMock = vi.fn()
const getClientIPMock = vi.fn()
const isURLBlockedMock = vi.fn()
const getAuthenticatedOwnerIdMock = vi.fn()
const resolveAvailableSlugMock = vi.fn()

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
  CLICKS_PREFIX: 'c:',
  INFO_PREFIX: 'i:',
  REDIRECT_PREFIX: 'r:',
  SLUG_INDEX: 'slug:idx',
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIP: getClientIPMock,
}))

vi.mock('@/lib/blocklist', () => ({
  isURLBlocked: isURLBlockedMock,
}))

vi.mock('@/lib/links', () => ({
  getAuthenticatedOwnerId: getAuthenticatedOwnerIdMock,
  getLinkRecord: vi.fn(),
  getUserLinksKey: (ownerId: string) => `ul:${ownerId}`,
  resolveAvailableSlug: resolveAvailableSlugMock,
}))

describe('POST /api/links', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 })
    getClientIPMock.mockReturnValue('127.0.0.1')
    isURLBlockedMock.mockReturnValue({ blocked: false })
    getAuthenticatedOwnerIdMock.mockResolvedValue(null)
    resolveAvailableSlugMock.mockResolvedValue({ slug: 'abc123' })
    pipeline.exec.mockResolvedValue([])
  })

  it('creates a public link and stores all core Redis records', async () => {
    const { POST } = await import('@/app/api/links/route')
    const request = new Request('https://app.test/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/post/1' }),
    })

    const response = await POST(request as never)
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.slug).toBe('abc123')
    expect(pipeline.set).toHaveBeenCalledWith('r:abc123', 'https://example.com/post/1')
    expect(pipeline.hset).toHaveBeenCalledWith(
      'i:abc123',
      expect.objectContaining({
        slug: 'abc123',
        url: 'https://example.com/post/1',
      })
    )
    expect(pipeline.set).toHaveBeenCalledWith('c:abc123', 0)
    expect(pipeline.sadd).toHaveBeenCalledWith('slug:idx', 'abc123')
  })

  it('indexes authenticated links under the owner email too', async () => {
    getAuthenticatedOwnerIdMock.mockResolvedValue('miguel@example.com')

    const { POST } = await import('@/app/api/links/route')
    const request = new Request('https://app.test/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/owned' }),
    })

    const response = await POST(request as never)

    expect(response.status).toBe(201)
    expect(pipeline.hset).toHaveBeenCalledWith(
      'i:abc123',
      expect.objectContaining({ ownerId: 'miguel@example.com' })
    )
    expect(pipeline.sadd).toHaveBeenCalledWith('ul:miguel@example.com', 'abc123')
  })
})
