import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = {
  exists: vi.fn(),
  hgetall: vi.fn(),
  hset: vi.fn(),
  sadd: vi.fn(),
}

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
  INFO_PREFIX: 'i:',
  REDIRECT_PREFIX: 'r:',
}))

vi.mock('@/lib/links', () => ({
  getUserLinksKey: (ownerId: string) => `ul:${ownerId}`,
}))

describe('claimLegacyLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('claims unowned legacy links and reindexes them', async () => {
    redisMock.exists.mockResolvedValue(1)
    redisMock.hgetall.mockResolvedValue({ createdAt: '2026-03-25T00:00:00.000Z' })

    const { claimLegacyLinks } = await import('@/lib/legacy-links')
    const result = await claimLegacyLinks('miguel@example.com', ['old-one'])

    expect(result.summary.claimed).toBe(1)
    expect(redisMock.hset).toHaveBeenCalledWith('i:old-one', expect.objectContaining({ ownerId: 'miguel@example.com' }))
    expect(redisMock.sadd).toHaveBeenCalledWith('ul:miguel@example.com', 'old-one')
  })

  it('refuses to take links owned by someone else', async () => {
    redisMock.exists.mockResolvedValue(1)
    redisMock.hgetall.mockResolvedValue({ ownerId: 'other@example.com' })

    const { claimLegacyLinks } = await import('@/lib/legacy-links')
    const result = await claimLegacyLinks('miguel@example.com', ['protected'])

    expect(result.results[0]).toEqual({ slug: 'protected', status: 'owned-by-someone-else' })
    expect(redisMock.hset).not.toHaveBeenCalled()
  })
})
