import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAuthenticatedOwnerIdMock = vi.fn()
const createApiKeyMock = vi.fn()
const checkRateLimitMock = vi.fn()
const getClientIPMock = vi.fn()

vi.mock('@/lib/dashboard-auth', () => ({
  requireAuthenticatedOwnerId: requireAuthenticatedOwnerIdMock,
}))

vi.mock('@/lib/api-keys', () => ({
  createApiKey: createApiKeyMock,
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  TIER_LIMITS: {
    free: { requestsPerDay: 1000, requestsPerMinute: 10 },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIP: getClientIPMock,
}))

function makeRequest(body: unknown) {
  return new Request('https://app.test/api/keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/keys authorization', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    requireAuthenticatedOwnerIdMock.mockResolvedValue('signed-in@example.com')
    getClientIPMock.mockReturnValue('127.0.0.1')
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      resetAt: Date.now() + 60_000,
    })
    createApiKeyMock.mockResolvedValue({
      key: 'sk_live_synthetic_test_key',
      data: {
        email: 'signed-in@example.com',
        tier: 'free',
        createdAt: '2026-10-25T00:00:00.000Z',
      },
    })
  })

  it('rejects anonymous email-based key issuance before any storage or rate limit work', async () => {
    requireAuthenticatedOwnerIdMock.mockRejectedValue(new Error('UNAUTHORIZED'))

    const { POST } = await import('@/app/api/keys/route')
    const response = await POST(makeRequest({ email: 'victim@example.com' }) as never)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(createApiKeyMock).not.toHaveBeenCalled()
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })

  it('issues a key only for the authenticated account, ignoring a spoofed email', async () => {
    const { POST } = await import('@/app/api/keys/route')
    const response = await POST(
      makeRequest({ email: 'victim@example.com', label: 'My integration' }) as never
    )

    expect(response.status).toBe(201)
    expect(createApiKeyMock).toHaveBeenCalledWith(
      'signed-in@example.com',
      'free',
      'My integration'
    )
    expect((await response.json()).email).toBe('signed-in@example.com')
  })

  it('preserves rate limiting for authenticated key issuance', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      resetAt: Date.now() + 30_000,
    })

    const { POST } = await import('@/app/api/keys/route')
    const response = await POST(makeRequest({ label: 'Too many' }) as never)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(createApiKeyMock).not.toHaveBeenCalled()
  })

  it('allows signed-in issuance with an empty body and no email field', async () => {
    const { POST } = await import('@/app/api/keys/route')
    const response = await POST(makeRequest(null) as never)

    expect(response.status).toBe(201)
    expect(createApiKeyMock).toHaveBeenCalledWith('signed-in@example.com', 'free', null)
  })
})
