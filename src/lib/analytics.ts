import { redis, CLICK_EVENTS_PREFIX, CLICK_COUNTRY_PREFIX, CLICK_REFERRER_PREFIX, CLICK_DEVICE_PREFIX, INFO_PREFIX } from './redis'

export interface ClickEvent {
  timestamp: string
  country: string
  referrer: string
  device: string
}

export interface LinkAnalytics {
  countries: Array<{ label: string; count: number }>
  referrers: Array<{ label: string; count: number }>
  devices: Array<{ label: string; count: number }>
  recentClicks: ClickEvent[]
  lastClickedAt: string | null
}

function normalizeCountry(country?: string | null) {
  return country?.trim() || 'Unknown'
}

function normalizeReferrer(referrer?: string | null) {
  if (!referrer) return 'Direct'

  try {
    return new URL(referrer).hostname.replace(/^www\./, '') || 'Direct'
  } catch {
    return referrer.slice(0, 120) || 'Direct'
  }
}

function normalizeDevice(userAgent?: string | null) {
  if (!userAgent) return 'Unknown'

  const ua = userAgent.toLowerCase()

  if (/bot|crawler|spider|preview|facebookexternalhit|slurp/.test(ua)) return 'Bot'
  if (/ipad|tablet/.test(ua)) return 'Tablet'
  if (/mobi|iphone|android/.test(ua)) return 'Mobile'
  if (/windows|macintosh|linux|x11/.test(ua)) return 'Desktop'

  return 'Unknown'
}

function sortCounts(record: Record<string, number>) {
  return Object.entries(record)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function toCountRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, Number(count) || 0])
  )
}

export async function recordClickEvent(
  slug: string,
  input: { country?: string | null; referrer?: string | null; userAgent?: string | null }
) {
  const timestamp = new Date().toISOString()
  const event: ClickEvent = {
    timestamp,
    country: normalizeCountry(input.country),
    referrer: normalizeReferrer(input.referrer),
    device: normalizeDevice(input.userAgent),
  }

  const pipeline = redis.pipeline()
  pipeline.lpush(`${CLICK_EVENTS_PREFIX}${slug}`, JSON.stringify(event))
  pipeline.ltrim(`${CLICK_EVENTS_PREFIX}${slug}`, 0, 49)
  pipeline.hincrby(`${CLICK_COUNTRY_PREFIX}${slug}`, event.country, 1)
  pipeline.hincrby(`${CLICK_REFERRER_PREFIX}${slug}`, event.referrer, 1)
  pipeline.hincrby(`${CLICK_DEVICE_PREFIX}${slug}`, event.device, 1)
  pipeline.hset(`${INFO_PREFIX}${slug}`, { lastClickedAt: timestamp })
  await pipeline.exec()

  return event
}

export async function getLinkAnalytics(slug: string): Promise<LinkAnalytics> {
  const [countriesRaw, referrersRaw, devicesRaw, recentRaw, info] = await Promise.all([
    redis.hgetall(`${CLICK_COUNTRY_PREFIX}${slug}`),
    redis.hgetall(`${CLICK_REFERRER_PREFIX}${slug}`),
    redis.hgetall(`${CLICK_DEVICE_PREFIX}${slug}`),
    redis.lrange<string>(`${CLICK_EVENTS_PREFIX}${slug}`, 0, 9),
    redis.hgetall(`${INFO_PREFIX}${slug}`),
  ])

  const recentClicks = (recentRaw || [])
    .map((entry) => {
      try {
        return JSON.parse(entry) as ClickEvent
      } catch {
        return null
      }
    })
    .filter((entry): entry is ClickEvent => Boolean(entry))

  return {
    countries: sortCounts(toCountRecord(countriesRaw)),
    referrers: sortCounts(toCountRecord(referrersRaw)),
    devices: sortCounts(toCountRecord(devicesRaw)),
    recentClicks,
    lastClickedAt: typeof info?.lastClickedAt === 'string' ? info.lastClickedAt : null,
  }
}
