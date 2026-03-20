# URL Squeeze — Spec

## 1. Concept & Vision

**URL Squeeze** is a minimal, fast URL shortener with a premium feel. Shorten links, get clean analytics, generate QR codes. No accounts required for basic use — just paste and go. Optional account for history and custom slugs.

Tone: confident, snappy, no-nonsense. Like a precision tool — not a cluttered enterprise dashboard.

## 2. Design Language

- **Aesthetic**: Clean minimalism with personality. Generous whitespace, sharp typography, bold accent color. Inspired by Linear/Vercel/Raycast — tools that feel *fast*.
- **Color palette**: 
  - Background: `#0a0a0a` (near black)
  - Surface: `#141414` (cards/panels)
  - Border: `#262626`
  - Text: `#fafafa` (primary), `#a1a1a1` (muted)
  - Accent: `#6366f1` (indigo-500) — CTAs, active states
  - Success: `#22c55e`
  - Danger: `#ef4444`
- **Typography**: Inter for UI, JetBrains Mono for slugs/URLs
- **Motion**: Subtle — fade-in on load (200ms), button press scale (0.98), smooth transitions. No gratuitous animations.
- **Icons**: Lucide React

## 3. Layout

### Public Page (`/`)
- Full-viewport centered hero
- Large input field: "Paste your long URL here"
- "Shorten" button (accent)
- Below: recent links (session-only, no DB) shown as chips
- Footer: minimal — just brand name

### Link Result (inline below input)
- Short URL displayed in monospace with copy button
- QR code generated inline
- Click count shown (updates live)

### Analytics Page (`/[slug]`)
- Public stats page for each link
- Metrics: total clicks, top countries, top referrers, device breakdown
- Created date
- QR code download button
- Link to submit a new link

### Admin Dashboard (`/dashboard`)
- Authenticated (NextAuth.js + GitHub OAuth)
- Link history table: slug, original URL, clicks, created, actions
- Create link form with custom slug option
- Delete link action
- Filter/search by slug or URL

## 4. Features

### Core
- [x] Shorten any valid URL
- [x] Auto-generate random 6-char slug (nanoid)
- [x] Custom slug option (user-specified)
- [x] Copy short URL to clipboard (one click)
- [x] QR code generation (qrcode library)
- [x] Public stats page per link (no auth needed)
- [x] Redirect from `/:slug` to original URL (server-side 302)

### Analytics (stored in DB)
- Total click count
- Country (geoip from IP)
- Referrer
- User-Agent / Device type
- Timestamp

### Dashboard (authenticated)
- List all links (paginated)
- Search by slug or URL
- Delete link
- Create link with custom slug
- Toggle link active/inactive

### Auth
- GitHub OAuth via NextAuth.js
- Protected dashboard routes
- Session-based

## 5. Technical Approach

### Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: NextAuth.js v5 (GitHub provider)
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **QR Codes**: `qrcode` npm package
- **GeoIP**: `geoip-lite`
- **Slug generation**: `nanoid`

### Data Model

```prisma
model Link {
  id        String   @id @default(cuid())
  slug      String   @unique
  url       String
  clicks    Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Click {
  id        String   @id @default(cuid())
  linkId    String
  link      Link     @relation(fields: [linkId], references: [id])
  ip        String?
  country   String?
  referrer  String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

### API Routes
```
POST   /api/links          — create short link
GET    /api/links          — list links (auth required)
DELETE /api/links/[id]     — delete link (auth required)
PATCH  /api/links/[id]     — update link (auth required)
GET    /api/links/[slug]   — get link info + stats
GET    /api/links/[slug]/qr — get QR code image
```

### Key Pages
```
/                          — public shorten page
/[slug]                    — redirect + stats page
/dashboard                — admin dashboard (auth required)
/dashboard/link/new       — create link form
```

## 6. What to Skip (MVP)

- Custom domains (future)
- Password-protected links (future)
- Link expiration (future)
- Teams/multi-user (future)
- Browser extension (future)
- Mobile app (future)

## 7. Out of Scope for First Pass

- A/B testing
- Campaign tracking UTM builder
- Bulk link import/export
- Password-protected links
- Link expiration
- Custom domains
