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

  it('preserves unowned legacy links without granting ownership by slug', async () => {
    redisMock.exists.mockResolvedValue(1)
    redisMock.hgetall.mockResolvedValue({ createdAt: '2026-03-25T00:00:00.000Z' })

    const { claimLegacyLinks } = await import('@/lib/legacy-links')
    const result = await claimLegacyLinks('miguel@example.com', ['old-one'])

    expect(result.results[0]).toEqual({ slug: 'old-one', status: 'verification-required' })
    expect(result.summary).toMatchObject({ claimed: 0, requiresVerification: 1 })
    expect(redisMock.hset).not.toHaveBeenCalled()
    expect(redisMock.sadd).not.toHaveBeenCalled()
  })

  it('reindexes an existing link only for its recorded owner', async () => {
    redisMock.exists.mockResolvedValue(1)
    redisMock.hgetall.mockResolvedValue({ ownerId: 'miguel@example.com' })

    const { claimLegacyLinks } = await import('@/lib/legacy-links')
    const result = await claimLegacyLinks('miguel@example.com', ['my-old-link'])

    expect(result.results[0]).toEqual({ slug: 'my-old-link', status: 'already-owned' })
    expect(redisMock.hset).not.toHaveBeenCalled()
    expect(redisMock.sadd).toHaveBeenCalledWith('ul:miguel@example.com', 'my-old-link')
  })

  it('does not mutate links with missing redirect records', async () => {
    redisMock.exists.mockResolvedValue(0)
    redisMock.hgetall.mockResolvedValue(null)

    const { claimLegacyLinks } = await import('@/lib/legacy-links')
    const result = await claimLegacyLinks('miguel@example.com', ['missing'])

    expect(result.results[0]).toEqual({ slug: 'missing', status: 'missing' })
    expect(redisMock.hset).not.toHaveBeenCalled()
    expect(redisMock.sadd).not.toHaveBeenCalled()
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
