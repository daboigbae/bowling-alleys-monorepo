# Audit: Bowling Alleys IO (BAIO)
Date: 2026-03-03
Branch: main
Scope: Full structural audit — architecture, API, auth, caching, data integrity

## Summary

BowlingAlleys.io is a well-architected monorepo (Next.js 14 frontend + Express.js API + Firebase Firestore) with 40+ REST endpoints, role-based auth, server-side caching, and strong SEO. The codebase is functional and live in production. However, the API layer lives in a single 6,221-line routes.ts file with no automated tests, inconsistent validation, and several data integrity risks that should be addressed before the planned rewrite.

Zero test coverage exists. No test framework is installed. This is the primary gap.

## Strengths

**Architecture**: Clean monorepo separation — frontend, server, and shared schema are well-isolated. The decoupled API design makes it straightforward to test endpoints independently.

**Caching**: Server-side memory cache for venues and hubs with promise deduplication and stale-on-error fallback. Smart approach for a Firestore-backed app.

**Auth system**: Three-tier authorization (public, authenticated, admin/full-admin) via Firebase Admin SDK. Clean middleware composition exported from auth.ts.

**SEO**: Comprehensive meta tag injection for venue/location pages, XML sitemap generation, Open Graph + Twitter Cards. Production-grade SEO strategy.

**Content pipeline**: MDX-based blog system, city hub pages, pricing analytics — content-rich platform with structured data.

**Data model**: Firestore collections are well-organized (venues, reviews, users, hubs, amenities, suggestions, pricing). Review system uses subcollections under venues.

## Issues Found

### Critical

**1. Orphaned reviews on venue deletion**
When a venue is deleted (line ~6200), reviews are queried from a top-level `reviews` collection. But reviews are actually stored as subcollections under `venues/:venueId/reviews/`. The cleanup query finds nothing, leaving orphan data.

**2. Cache promise deduplication race condition**
The promise deduplication pattern nulls out the promise reference before the resolution fully propagates. Between null-out and return, a concurrent request sees `promise === null` and starts a duplicate Firestore fetch. Under load, this defeats the entire cache strategy.

**3. Firestore read on every admin-auth check**
Every request hitting an admin-protected route reads the app config doc from Firestore to check the admin list. No caching. This adds latency to every admin operation and increases Firestore read costs linearly with traffic.

### Medium

**4. Cache invalidation inconsistency**
Five separate cache invalidation points across venue create, update, delete, and review create/delete. Review creation clears ALL review caches (`reviewsCache.byVenue.clear()`), but review deletion only clears the specific venue's cache (`reviewsCache.byVenue.delete(venueId)`). Inconsistent.

**5. No input validation on write endpoints**
`POST /api/venues`, `PUT /api/venues/:id`, and `PUT /api/users/:userId` accept raw `req.body` with no schema validation. Zod is installed but not used in the API layer. Invalid data can reach Firestore.

**6. Inconsistent error response shapes**
Some routes return `{ error: "msg" }`, others return `{ success: true, data }`, others return `{ message: "msg" }`. No standard response envelope. This makes client-side error handling fragile.

**7. Transaction boundary gap in review creation**
Review creation uses a Firestore transaction for the write, but cache invalidation happens outside the transaction. If cache invalidation throws, the review is saved but the cache is stale. Not catastrophic, but correctness gap.

**8. Email service error leaves orphaned verification codes**
If the email send fails after the verification code is already stored in Firestore, the code exists but the user never receives it. Should clean up the code doc on email failure.

### Minor

**9. Middleware spread operator usage**
`...requireAuthenticatedAdmin` spreads an array into Express middleware args. While it works in practice, it's non-standard and could cause issues with certain Express versions.

**10. Error handler re-throws after response**
The global error handler in index.ts calls `res.status(status).json()` then `throw err`. The throw is pointless after the response is sent and could cause unhandled rejection noise.

**11. No pagination on bulk endpoints**
Several GET endpoints (contacts, suggestions, admin lists) return all documents without limit. Vulnerable to memory issues at scale.

**12. Incomplete HTML escaping in meta tags**
Server-side meta tag injection escapes `<`, `>`, and `"` but doesn't cover all XSS vectors in attribute contexts.

**13. No rate limiting**
Only the verification code endpoint has rate limiting (60s cooldown). All other endpoints are unthrottled.

## Notes for Cursor

### File Map
- `server/routes.ts` (6,221 lines) — ALL API logic lives here. Primary target for testing and eventual refactoring.
- `server/auth.ts` (146 lines) — Auth middleware: `authenticateToken`, `requireAdmin`, `requireFullAdmin`
- `server/index.ts` (96 lines) — Express setup, CORS, compression, error handler
- `server/storage.ts` (39 lines) — Unused MemStorage abstraction
- `server/resend.ts` (74 lines) — Resend email client, verification code generation
- `server/emailService.ts` (38 lines) — Email service abstraction (mock + Resend implementations)
- `shared/schema.ts` (86 lines) — TypeScript interfaces (Venue, Review, User)
- `frontend/lib/api-client.ts` — Frontend API wrapper
- `frontend/providers/auth-provider.tsx` — Firebase auth context
- `firestore.rules` — Firestore security rules

### Gotchas
- Reviews are subcollections: `venues/:venueId/reviews/:userId` — NOT a top-level collection
- Server cache refreshes at midnight; individual venue fetches bypass cache
- Admin list is in Firestore at `config/app` document, read on every admin-protected request
- The `storage.ts` MemStorage class is completely unused — all routes use Firestore directly
- Drizzle ORM + PostgreSQL is configured but not active (legacy from migration)
- Frontend and API run on separate ports in dev (3000 and 5000)

### Dependencies to Watch
- Firebase Admin SDK handles both auth and database — no clean separation
- Resend for emails — only used for verification codes
- esbuild bundles the API for production — watch for dynamic imports breaking
