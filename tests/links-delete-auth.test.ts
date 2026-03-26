import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.fn()
const pipeline = {
  del: vi.fn(),
  exec: vi.fn(),
}
const redisMock = {
  exists: vi.fn(),
  hgetall: vi.fn(),
  pipeline: vi.fn(() => pipeline),
}
const cleanupLinkIndexesMock = vi.fn()

vi.mock('@/auth', () => ({
  auth: authMock,
}))

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
  REDIRECT_PREFIX: 'r:',
  CLICKS_PREFIX: 'c:',
  INFO_PREFIX: 'i:',
  CLICK_COUNTRY_PREFIX: 'cc:',
  CLICK_DEVICE_PREFIX: 'cd:',
  CLICK_EVENTS_PREFIX: 'ce:',
  CLICK_REFERRER_PREFIX: 'cr:',
}))

vi.mock('@/lib/analytics', () => ({
  getLinkAnalytics: vi.fn(),
}))

vi.mock('@/lib/links', () => ({
  cleanupLinkIndexes: cleanupLinkIndexesMock,
}))

describe('DELETE /api/links/[slug]', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    redisMock.exists.mockResolvedValue(1)
    redisMock.hgetall.mockResolvedValue({ ownerId: 'miguel@example.com' })
    pipeline.exec.mockResolvedValue([])
    cleanupLinkIndexesMock.mockResolvedValue(undefined)
  })

  it('rejects unauthenticated delete attempts', async () => {
    authMock.mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/links/[slug]/route')
    const response = await DELETE(new Request('https://app.test/api/links/abc123', { method: 'DELETE' }) as never, {
      params: Promise.resolve({ slug: 'abc123' }),
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(pipeline.del).not.toHaveBeenCalled()
  })

  it('rejects authenticated users deleting someone else\'s link', async () => {
    authMock.mockResolvedValue({ user: { email: 'other@example.com' } })

    const { DELETE } = await import('@/app/api/links/[slug]/route')
    const response = await DELETE(new Request('https://app.test/api/links/abc123', { method: 'DELETE' }) as never, {
      params: Promise.resolve({ slug: 'abc123' }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Link not found' })
    expect(pipeline.del).not.toHaveBeenCalled()
  })

  it('deletes owned links, purges analytics keys, and cleans indexes', async () => {
    authMock.mockResolvedValue({ user: { email: 'miguel@example.com' } })

    const { DELETE } = await import('@/app/api/links/[slug]/route')
    const response = await DELETE(new Request('https://app.test/api/links/abc123', { method: 'DELETE' }) as never, {
      params: Promise.resolve({ slug: 'abc123' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(pipeline.del).toHaveBeenCalledTimes(7)
    expect(cleanupLinkIndexesMock).toHaveBeenCalledWith('abc123', 'miguel@example.com')
  })
})
