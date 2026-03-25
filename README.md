# URL Squeeze

> Minimal URL shortener with clean analytics and QR codes. Self-hostable, open source.

![URL Squeeze](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

- **URL Shortening** - Create short links with auto-generated or custom slugs
- **QR Codes** - Generate QR codes for any link
- **Click Analytics** - Track clicks with country, referrer, and device info
- **Public Stats** - Shareable stats page for any link
- **Dashboard** - Manage all your links in one place
- **API Access** - Full REST API with rate-limited tiers
- **Custom Domains** - White-label with your own domain
- **Interstitial Pages** - Optional splash page for monetization
- **Affiliate Links** - Auto-insert affiliate IDs for major retailers

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Upstash Redis (serverless, free tier available)
- **Auth**: NextAuth.js v5 (GitHub OAuth)
- **Analytics**: Built-in with geo-IP (geoip-lite)

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/url-squeeze.git
cd url-squeeze
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

| Variable | Where to get it |
|----------|----------------|
| `AUTH_GITHUB_ID` | [GitHub OAuth App](https://github.com/settings/applications/new) |
| `AUTH_GITHUB_SECRET` | Same GitHub OAuth App page |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `UPSTASH_REDIS_REST_URL` | [Upstash Redis](https://upstash.com) (free tier) |
| `UPSTASH_REDIS_REST_TOKEN` | Same Upstash dashboard |

### Base URL setup (important)

This app uses **two URL env vars** and both should match the place where the app is running:

- `NEXTAUTH_URL` → the full app URL used by auth callbacks
- `NEXT_PUBLIC_BASE_URL` → the public base URL used to generate short links and QR links

**For local development:**

```env
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**For production / deployed app:**

```env
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

If a user deploys their own copy, these are the first values they should change.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/import)

1. Fork/cloned this repo to GitHub
2. Import to Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

## API

### Create a short link

```bash
curl -X POST https://your-domain.com/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/url"}'
```

### Response

```json
{
  "id": "abc123",
  "slug": "abc123",
  "url": "https://example.com/very/long/url",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "clicks": 0
}
```

### Get QR Code

```
GET /api/links/[slug]/qr
```

Returns a base64 PNG QR code image.

## Monetization

URL Squeeze supports multiple monetization methods:

### Affiliate Links
Configure affiliate IDs in `src/lib/affiliate.ts`. URLs matching retailer patterns automatically get affiliate IDs appended.

### API Tiers
- **Free**: 100 links/day, 10/minute
- **Pro** (future): Higher limits + API key management

### Custom Domains
Register custom domains via the API:
```bash
curl -X POST https://your-domain.com/api/domains \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"domain": "links.yourbrand.com", "brandName": "Your Brand"}'
```

## Project Structure

```
src/
├── app/
│   ├── [slug]/           # Redirect handler
│   ├── api/              # API routes
│   ├── dashboard/         # Admin dashboard
│   └── s/[slug]/         # Public stats page
├── lib/
│   ├── redis.ts          # Redis client
│   ├── affiliate.ts      # Affiliate link mapping
│   ├── rate-limit.ts     # IP/API rate limiting
│   ├── whitelist.ts      # IP whitelist
│   └── blocklist.ts      # URL blocklist
└── components/
    └── ui/               # shadcn/ui components
```

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT
