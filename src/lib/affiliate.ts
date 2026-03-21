/**
 * Affiliate link configuration for URL Squeeze
 *
 * Maps retailer URL patterns to affiliate ID insertion.
 * Only adds affiliate ID if: (1) URL matches pattern AND (2) affiliate ID is configured (not empty).
 *
 * Environment variables to set (replace placeholder values):
 *   AFFILIATE_AMAZON    - Amazon Associates tag (e.g., yourname-20)
 *   AFFILIATE_TARGET    - Target affiliate ID
 *   AFFILIATE_WALMART   - Walmart affiliate ID
 *   AFFILIATE_BESTBUY   - Best Buy affiliate ID
 *   AFFILIATE_EBAY      - eBay campaign ID (campid)
 *   AFFILIATE_HOMEDEPOT - Home Depot affiliate ref
 *   AFFILIATE_LOWES     - Lowe's affiliate ref
 *   AFFILIATE_COSTCO    - Costco affiliate ID
 *   AFFILIATE_BHPHOTO   - B&H Photo affiliate ID
 *   AFFILIATE_NEWEGG    - Newegg affiliate ID
 */

export interface AffiliateRetailer {
  /** Display name */
  name: string
  /** Regex pattern to match against the normalized (https://) URL */
  pattern: RegExp
  /** Parameter key used for this retailer's affiliate program */
  paramKey: string
  /** Affiliate ID env var name */
  envKey: string
}

const RETAILERS: AffiliateRetailer[] = [
  {
    name: 'Amazon',
    pattern: /^https?:\/\/(?:www\.)?amazon\.(?:com|co\.uk|ca|de|fr|it|es|co\.jp|com\.mx|com\.br|in|com\.au)(?:\/.*)?$/,
    paramKey: 'tag',
    envKey: 'AFFILIATE_AMAZON',
  },
  {
    name: 'Target',
    pattern: /^https?:\/\/(?:www\.)?target\.com(?:\/.*)?$/,
    paramKey: 'AFID',
    envKey: 'AFFILIATE_TARGET',
  },
  {
    name: 'Walmart',
    pattern: /^https?:\/\/(?:www\.)?walmart\.com(?:\/.*)?$/,
    paramKey: 'affiliateId',
    envKey: 'AFFILIATE_WALMART',
  },
  {
    name: 'Best Buy',
    pattern: /^https?:\/\/(?:www\.)?bestbuy\.com(?:\/.*)?$/,
    paramKey: 'aff_id',
    envKey: 'AFFILIATE_BESTBUY',
  },
  {
    name: 'eBay',
    pattern: /^https?:\/\/(?:www\.)?ebay\.(?:com|co\.uk|de|fr|it|es|com\.au|ca)(?:\/.*)?$/,
    paramKey: 'campid',
    envKey: 'AFFILIATE_EBAY',
  },
  {
    name: "Home Depot",
    pattern: /^https?:\/\/(?:www\.)?homedepot\.com(?:\/.*)?$/,
    paramKey: 'ref',
    envKey: 'AFFILIATE_HOMEDEPOT',
  },
  {
    name: "Lowe's",
    pattern: /^https?:\/\/(?:www\.)?lowes\.com(?:\/.*)?$/,
    paramKey: 'ref',
    envKey: 'AFFILIATE_LOWES',
  },
  {
    name: 'Costco',
    pattern: /^https?:\/\/(?:www\.)?costco\.com(?:\/.*)?$/,
    paramKey: 'affiliate_id',
    envKey: 'AFFILIATE_COSTCO',
  },
  {
    name: 'B&H Photo',
    pattern: /^https?:\/\/(?:www\.)?bhphotovideo\.com(?:\/.*)?$/,
    paramKey: 'a',
    envKey: 'AFFILIATE_BHPHOTO',
  },
  {
    name: 'Newegg',
    pattern: /^https?:\/\/(?:www\.)?newegg\.com(?:\/.*)?$/,
    paramKey: 'AFFID',
    envKey: 'AFFILIATE_NEWEGG',
  },
]

/**
 * Get the affiliate ID for a retailer from environment variables.
 * Returns null if not configured or empty.
 */
function getAffiliateId(envKey: string): string | null {
  const value = process.env[envKey]
  if (!value || value.trim() === '') return null
  return value.trim()
}

/**
 * Build an affiliate URL by appending the affiliate parameter to the destination URL.
 */
function buildAffiliateUrl(url: string, paramKey: string, affiliateId: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${paramKey}=${encodeURIComponent(affiliateId)}`
}

/**
 * Apply affiliate ID to a destination URL if it matches any known retailer pattern.
 *
 * Returns the original URL unchanged if:
 *   - No retailer pattern matches, OR
 *   - The matching retailer's affiliate ID is not configured (env var empty/unset)
 *
 * @param url - The destination URL to potentially modify
 * @returns The URL with affiliate ID appended, or original URL unchanged
 */
export function applyAffiliateToUrl(url: string): string {
  // Normalize: ensure URL has a protocol prefix for consistent pattern matching
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  for (const retailer of RETAILERS) {
    if (retailer.pattern.test(normalizedUrl)) {
      const affiliateId = getAffiliateId(retailer.envKey)
      if (affiliateId) {
        return buildAffiliateUrl(normalizedUrl, retailer.paramKey, affiliateId)
      }
    }
  }

  // No match or no affiliate ID configured — return URL unchanged
  return url
}

/**
 * Get all configured affiliate IDs (for admin display/debugging).
 * Returns retailer name → affiliate ID mapping (null if not configured).
 */
export function getConfiguredAffiliates(): Record<string, string | null> {
  return Object.fromEntries(
    RETAILERS.map((r) => [r.name, getAffiliateId(r.envKey)])
  )
}
