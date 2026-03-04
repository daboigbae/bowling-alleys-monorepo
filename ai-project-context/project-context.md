# Project Context: Bowling Alleys IO (BAIO)

## Overview
BowlingAlleys.io is a comprehensive platform for discovering, rating, and reviewing bowling alleys across the United States. Features include interactive maps, detailed venue pages, user-generated reviews, owner profiles, pricing analytics, and specialized directory/hub pages. The platform is a monorepo with a decoupled Next.js frontend and Express.js API backend.

## Repository
- **Repo**: bowling-alleys-monorepo
- **Live URL**: https://bowlingalleys.io
- **Structure**: Monorepo — `frontend/` (Next.js), `server/` (Express API), `shared/` (TypeScript schemas)
- **Hosting**: Vercel (frontend), Node.js server (API), Firebase Firestore (database), Google Cloud Storage (files)

## Tech Stack

### Frontend (`frontend/`)
- Next.js 14 (App Router) + React 18.3 + TypeScript 5
- Tailwind CSS 3.4 + shadcn/ui + Radix UI
- TanStack Query 5.60 (server state)
- React Hook Form 7.55 + Zod 3.24 (forms/validation)
- Firebase Auth (client-side authentication)
- Leaflet 1.9 + OpenStreetMap (interactive maps)
- Framer Motion (animations)
- MDX blog system (gray-matter + remark)
- 55+ App Router routes

### Backend (`server/`)
- Express.js 4.21 + TypeScript (tsx for dev execution)
- Firebase Admin SDK 13.5 (auth + Firestore)
- Google Cloud Storage (file/image storage)
- Resend 6.3 (email verification codes)
- esbuild (production bundling to ESM)
- Server-side memory caching (daily refresh at midnight)
- 40+ REST API endpoints across 6,221 lines in routes.ts

### Database
- **Primary**: Firebase Firestore (NoSQL)
  - Collections: venues, reviews (subcollection under venues), users, hubs, amenities, suggestions, pricing, venue-accuracy-reports, saved-alleys, config
- **Secondary (unused)**: PostgreSQL via Drizzle ORM (configured but not active)

### External Services
- Firebase (Auth + Firestore)
- Google Cloud Storage
- Resend (email delivery)
- Google Analytics
- OpenStreetMap (maps)
- Yelp S3 (venue images)

## App Structure

```
bowling-alleys-monorepo/
├── frontend/                      # Next.js 14 app
│   ├── app/                      # App Router pages (55+ routes)
│   │   ├── venue/                # Venue detail pages
│   │   ├── locations/            # State/city location pages
│   │   ├── blog/                 # Blog listing
│   │   ├── profile/              # User profile
│   │   ├── my-venues/            # Owner management
│   │   ├── saved-alleys/         # User's saved venues
│   │   ├── [slug]/               # Dynamic hub/category pages
│   │   └── ...                   # 40+ more route directories
│   ├── components/
│   │   ├── pages/                # Page-specific components
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── api-client.ts         # API wrapper (clientApiRequest/serverApiRequest)
│   │   ├── firebase.ts           # Firebase client SDK init
│   │   ├── firestore.ts          # Firestore operations + client-side cache
│   │   ├── analytics.ts          # GA tracking
│   │   └── utils.ts              # Utilities
│   ├── providers/
│   │   ├── auth-provider.tsx     # Firebase auth context
│   │   └── query-provider.tsx    # TanStack Query setup
│   ├── hooks/                    # Custom hooks
│   └── content/blog/             # MDX blog posts (20+)
├── server/                        # Express API
│   ├── index.ts                  # Server entry (96 lines)
│   ├── routes.ts                 # ALL API routes (6,221 lines)
│   ├── auth.ts                   # Auth middleware (authenticateToken, requireAdmin, requireFullAdmin)
│   ├── resend.ts                 # Resend email client + verification code generation
│   ├── emailService.ts           # Email service abstraction (mock + Resend)
│   ├── storage.ts                # Unused MemStorage abstraction
│   └── objectStorage.ts          # Google Cloud Storage integration
├── shared/
│   └── schema.ts                 # TypeScript interfaces (Venue, Review, User)
└── docs/
    └── venue-analytics-events.md # GA event tracking documentation
```

## API Endpoints (40+)

### Venues (10)
- `GET /api/venues` — List (with server cache)
- `GET /api/venues/:id` — Single venue (bypasses cache)
- `GET /api/venues/by-state/:state` — By state
- `GET /api/venues/by-state-city/:state/:city` — By state+city
- `GET /api/venues/top-alleys` — Top rated
- `GET /api/venues/founding-partners` — Partners
- `GET /api/venues/by-proximity` — Near coordinates (100mi radius expansion)
- `GET /api/venues/stats/by-state` — Stats
- `POST /api/venues` — Create (admin auth)
- `PUT /api/venues/:id` — Update (user auth)
- `DELETE /api/venues/:id` — Delete (full admin auth)

### Reviews (6)
- `GET /api/venues/:venueId/reviews` — Venue reviews
- `GET /api/reviews/recent` — Recent reviews
- `GET /api/reviews/user/:userId` — User's reviews
- `GET /api/reviews/venue/:venueId/user/:userId` — Specific user+venue review
- `POST /api/reviews` — Create/update (auth, uses Firestore transaction)
- `DELETE /api/reviews/:venueId` — Delete (auth)

### Auth (2)
- `POST /api/auth/send-code` — Send email verification code (60s rate limit)
- `POST /api/auth/verify-code` — Verify and get Firebase custom token

### Users (5)
- `GET /api/users/:userId` — Profile
- `GET /api/users/by-slug/:slug` — Owner by slug
- `PUT /api/users/:userId` — Update (auth)
- `GET /api/users/:userId/venues` — Claimed venues
- `GET /api/users/:userId/saved-alleys` — Saved venues (auth)

### Saved Alleys (2)
- `POST /api/users/:userId/saved-alleys/:venueId` — Save (auth)
- `DELETE /api/users/:userId/saved-alleys/:venueId` — Unsave (auth)

### Pricing (6)
- `GET /api/pricing/usa`, `/state/:state`, `/city/:city/:state`, `/states`, `/cities/:state`, `/extremes`

### Hubs (2)
- `GET /api/hubs` — All hub categories (cached)
- `GET /api/hubs/:slug` — Hub detail

### Other
- `GET /api/health` — Health check
- `GET /sitemap.xml` — XML sitemap
- Blog (2), Contact (1), Venue Accuracy Reports (3), Suggestions (3), Amenities (4)

## Authorization Levels
- **Public**: All GET venue/review/pricing/hub queries
- **Authenticated**: POST/PUT/DELETE for user data, reviews, saved alleys
- **Admin** (`requireAuthenticatedAdmin`): Venue creation, amenities CRUD
- **Full Admin** (`requireAuthenticatedFullAdmin`): Venue deletion, admin management

## Key Technical Debt
1. Zero test coverage (no test framework installed)
2. Monolithic routes.ts (6,221 lines)
3. Admin auth check reads Firestore on every request (no caching)
4. Inconsistent error response shapes
5. Incomplete input validation on write endpoints
6. Drizzle ORM configured but unused

## Known Bugs
1. Venue deletion queries wrong collection path for review cleanup — reviews are subcollections (`venues/:venueId/reviews/`) but delete queries top-level `reviews` collection
2. Cache promise deduplication has race condition — promise nulled before resolution propagates
3. Email send failure leaves orphaned verification code in Firestore

## Audit History

| Date | Scope | File |
|------|-------|------|
| 2026-03-03 | Full Structural Audit | audits/2026-03-03-full-structural-audit.md |

## Research

| Date | Topic | File |
|------|-------|------|
