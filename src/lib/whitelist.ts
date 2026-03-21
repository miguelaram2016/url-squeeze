// IPs that bypass rate limiting
// Add your IPs here to get unlimited access
export const WHITELISTED_IPS = [
  '104.57.178.34',    // External (AT&T Austin)
  '100.71.142.86',    // Tailscale
]

// Check if IP is whitelisted
export function isWhitelisted(ip: string): boolean {
  return WHITELISTED_IPS.includes(ip)
}
