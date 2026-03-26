import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = {
  set: vi.fn(),
  sadd: vi.fn(),
  get: vi.fn(),
  smembers: vi.fn(),
  del: vi.fn(),
  srem: vi.fn(),
  incr: vi.fn(),
}

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}))

describe('api key helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists masked keys for an owner', async () => {
    const keyId = 'sk_live_test_abcdefghijklmnopqrstuvwx1234'
    redisMock.smembers.mockResolvedValue([keyId])
    redisMock.get.mockImplementation(async (key: string) => {
      if (key === `apikey:${keyId}`) {
        return JSON.stringify({
          email: 'miguel@example.com',
          tier: 'free',
          createdAt: '2026-03-25T12:00:00.000Z',
          usageCount: 0,
          label: 'Zapier',
        })
      }
      return null
    })

    const { listApiKeys } = await import('@/lib/api-keys')
    const keys = await listApiKeys('miguel@example.com')

    expect(keys).toHaveLength(1)
    expect(keys[0]).toEqual(expect.objectContaining({
      label: 'Zapier',
      tier: 'free',
      lastFour: '1234',
    }))
    expect(keys[0]?.maskedKey).toContain('…1234')
  })

  it('revokes only keys owned by that email', async () => {
    const keyId = 'sk_live_test_abcdefghijklmnopqrstuvwx1234'
    redisMock.get.mockImplementation(async (key: string) => {
      if (key === `apikey:${keyId}`) {
        return JSON.stringify({
          email: 'miguel@example.com',
          tier: 'free',
          createdAt: '2026-03-25T12:00:00.000Z',
          usageCount: 0,
        })
      }
      return null
    })

    const { revokeApiKey } = await import('@/lib/api-keys')
    const revoked = await revokeApiKey('miguel@example.com', keyId)

    expect(revoked).toBe(true)
    expect(redisMock.del).toHaveBeenCalledWith(`apikey:${keyId}`)
    expect(redisMock.srem).toHaveBeenCalledWith('apikey:meta:email:miguel@example.com', keyId)
  })
})
