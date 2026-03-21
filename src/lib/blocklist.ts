// Blocked domains - URLs containing these patterns will be rejected
// Add known phishing, malware, scam, or abusive domains here
// Patterns are checked as: domain.includes(blockedPattern) OR url.includes(blockedPattern)
export const BLOCKED_PATTERNS = [
  // Known phishing/malware domains (partial matches)
  'phishing',
  'malware',
  'virus',
  'scam',
  'fake',
  // Add more as needed
]

// Blocked exact domains (full domain must match exactly after normalization)
export const BLOCKED_DOMAINS: string[] = [
  // Example: 'badsite.com', 'malware.com'
  // Add reported abusive domains here
]

// Check if a URL is blocked
export function isURLBlocked(url: string): { blocked: boolean; reason?: string } {
  const normalizedUrl = url.toLowerCase()
  const parsedUrl = new URL(url)
  const domain = parsedUrl.hostname.toLowerCase()

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (normalizedUrl.includes(pattern.toLowerCase())) {
      return { blocked: true, reason: `URL contains blocked pattern: ${pattern}` }
    }
  }

  // Check blocked exact domains
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain === blocked.toLowerCase() || domain.endsWith('.' + blocked.toLowerCase())) {
      return { blocked: true, reason: `Domain is blocked: ${blocked}` }
    }
  }

  return { blocked: false }
}
