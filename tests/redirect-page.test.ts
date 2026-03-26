import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = {
  get: vi.fn(),
  incr: vi.fn(),
}
const redirectMock = vi.fn((location: string) => {
  throw new Error(`REDIRECT:${location}`)
})
const headersMock = vi.fn()

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
  getLinkKeys: (slug: string) => ({
    redirect: `r:${slug}`,
    clicks: `c:${slug}`,
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

describe('/[slug] redirect page', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    headersMock.mockResolvedValue(new Headers({ 'x-forwarded-for': '8.8.8.8' }))
    redisMock.incr.mockResolvedValue(1)
  })

  it('increments click counts and redirects to the destination URL', async () => {
    redisMock.get.mockResolvedValue('https://example.com/final')

    const { default: RedirectPage } = await import('@/app/[slug]/page')

    await expect(RedirectPage({ params: Promise.resolve({ slug: 'abc123' }) })).rejects.toThrow(
      'REDIRECT:https://example.com/final'
    )

    expect(redisMock.get).toHaveBeenCalledWith('r:abc123')
    expect(redisMock.incr).toHaveBeenCalledWith('c:abc123')
  })

  it('redirects home when the slug does not exist', async () => {
    redisMock.get.mockResolvedValue(null)

    const { default: RedirectPage } = await import('@/app/[slug]/page')

    await expect(RedirectPage({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('REDIRECT:/')
    expect(redisMock.incr).not.toHaveBeenCalled()
  })
})
