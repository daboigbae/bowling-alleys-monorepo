# Bowling Alleys IO — Project Conventions

> This file documents BAIO-specific patterns found in the codebase. It covers how this project is actually built — not how it should be built. Follow these conventions when making changes.

---

## Frontend Conventions

### Component Structure

Components use named exports with TypeScript interfaces for props:

```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
}: AuthModalProps) {
  // Component body
}
```

Rules:
- Props defined as interface above the component
- Client components use `'use client'` directive at the top
- Server components (no directive) are used for SEO pages with `generateMetadata`
- shadcn/ui + Radix UI for all UI primitives

---

### Page Structure (App Router)

Pages follow this pattern — `generateMetadata` for SEO, then the page component:

```typescript
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const venue = await getVenueForMetadata(params.id);
  return {
    title: pageTitle,
    description: desc,
    openGraph: { type: 'website', ... },
  };
}

export default async function VenueDetail({ params }: { params: { id: string } }) {
  const venueData = await getVenueForMetadata(params.id);
  return <VenueDetailPage venueId={params.id} initialVenueData={venueData} />;
}
```

Rules:
- Server components fetch initial data and pass to client components as props
- Client components handle interactivity (reviews, forms, maps)
- Dynamic imports with `next/dynamic` for heavy components (maps, charts)

---

### API Client (lib/api-client.ts)

Two request functions — `serverApiRequest` (no auth) and `clientApiRequest` (with auth):

```typescript
export async function clientApiRequest(
  method: string,
  endpoint: string,
  data?: any,
  requireAuth = false
): Promise<any> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (requireAuth) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

// Convenience wrapper
export const api = {
  get: (endpoint, requireAuth?) => clientApiRequest('GET', endpoint, undefined, requireAuth),
  post: (endpoint, data?, requireAuth?) => clientApiRequest('POST', endpoint, data, requireAuth),
  put: (endpoint, data?, requireAuth?) => clientApiRequest('PUT', endpoint, data, requireAuth),
  delete: (endpoint, requireAuth?) => clientApiRequest('DELETE', endpoint, undefined, requireAuth),
};
```

Rules:
- Always use `api.get()`, `api.post()`, etc. for client-side requests
- Auth token comes from Firebase `auth.currentUser.getIdToken()`
- `requireAuth` parameter controls whether Bearer token is attached

---

### Auth Context (providers/auth-provider.tsx)

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCodeAndSignIn: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
```

Rules:
- Access auth state via `useAuth()` hook
- `onAuthStateChanged` listener manages auth state
- Toast notifications for all user-facing auth actions

---

### TanStack Query Configuration

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

Rules:
- `useQuery` for data fetching, `useMutation` for mutations
- `useQueryClient` for cache invalidation after mutations
- No automatic retries — manual control only
- 5-minute stale time default

---

### Styling

Tailwind CSS + shadcn/ui exclusively:

```tsx
<div className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Peak Pricing
      </CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* content */}
    </CardContent>
  </Card>
</div>
```

Rules:
- `className` with Tailwind utilities for all styling
- shadcn/ui components (Card, Button, Dialog, etc.) for structure
- Responsive: `grid-cols-1 md:grid-cols-3`
- Color tokens: `text-primary`, `text-muted-foreground`, `bg-primary/10`
- Lucide React for icons: `<Star className="h-5 w-5" />`
- No CSS modules, no styled-components, no inline style objects

---

### Import Order

```typescript
// 1. React / Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 2. Third-party libraries
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 3. Internal components / lib (with @/ alias)
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

// 4. Icons
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
```

---

### File Naming

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `AuthModal.tsx`, `VenueCard.tsx` |
| Hooks | camelCase with `use-` prefix | `use-toast.ts`, `use-analytics.tsx` |
| Library files | camelCase with hyphens | `api-client.ts`, `firestore.ts` |
| Pages | `page.tsx` in app directory | `app/venue/[id]/page.tsx` |
| UI components | camelCase (shadcn convention) | `components/ui/button.tsx` |

---

### Forms

Forms use `useState` with object state, `useMutation` for submission:

```typescript
const [formData, setFormData] = useState({
  name: "",
  description: "",
  lanes: 1,
  amenities: [] as string[],
  // ...
});
```

Rules:
- `useState` for form state (not React Hook Form in most pages — despite it being installed)
- `useMutation` for async submission
- `useToast` for user feedback
- `useQueryClient().invalidateQueries()` after successful mutation

---

## Backend Conventions

### Route Structure (server/routes.ts)

**Public endpoint pattern:**
```typescript
app.get("/api/venues", async (req, res) => {
  try {
    const venues = await getVenuesForSitemap();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});
```

**Protected endpoint pattern:**
```typescript
app.post("/api/reviews", authenticateToken, async (req: ExpressRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // ... implementation
    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: error.message || "Failed to create review" });
  }
});
```

**Admin endpoint pattern:**
```typescript
app.post("/api/venues", ...requireAuthenticatedAdmin, async (req, res) => {
  // ...
});
```

Rules:
- Every handler wrapped in try/catch
- Specific status codes: 201 create, 204 delete, 400 validation, 401 unauth, 403 forbidden, 404 not found, 500 error
- `console.error` with context string for debugging
- Error responses always use `{ error: "message" }` shape

---

### Auth Middleware (server/auth.ts)

```typescript
// Token verification
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  const idToken = authHeader.substring(7);
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  req.user = { uid: decodedToken.uid, email: decodedToken.email };
  next();
};

// Composed middleware arrays
export const requireAuthenticatedAdmin = [authenticateToken, requireAdmin];
export const requireAuthenticatedFullAdmin = [authenticateToken, requireFullAdmin];
```

Usage with spread operator:
```typescript
app.post("/api/venues", ...requireAuthenticatedAdmin, async (req, res) => { });
app.delete("/api/venues/:id", ...requireAuthenticatedFullAdmin, async (req, res) => { });
```

---

### Firestore Patterns

**Simple query:**
```typescript
const snapshot = await db.collection("venues").doc(id).get();
const data = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
```

**Filtered query:**
```typescript
const snapshot = await db.collection("venues")
  .where("state", "==", state)
  .orderBy("name")
  .get();
const venues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Subcollection (reviews):**
```typescript
const reviewRef = db.collection("venues").doc(venueId).collection("reviews").doc(userId);
```

**Transaction (review create with rating update):**
```typescript
await db.runTransaction(async (transaction) => {
  const venueDoc = await transaction.get(venueRef);
  const reviewDoc = await transaction.get(reviewRef);

  if (reviewDoc.exists) {
    transaction.update(reviewRef, reviewData);
    // Recalculate average rating
  } else {
    transaction.set(reviewRef, reviewData);
    // Increment reviewCount and recalculate average
  }
  transaction.update(venueRef, { avgRating: newAvg, reviewCount: newCount });
});
```

---

### Cache Pattern

Server-side memory cache with midnight expiry, promise deduplication, and stale fallback:

```typescript
const getCachedHubs = async (): Promise<HubData[]> => {
  if (!isHubsCacheExpired()) return hubsCache.hubs;           // Cache hit
  if (hubsCache.promise) return hubsCache.promise;            // Dedup in-flight

  hubsCache.promise = (async () => {
    try {
      const snapshot = await db.collection("hubs").get();
      hubsCache.hubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      hubsCache.timestamp = Date.now();
      hubsCache.promise = null;
      return hubsCache.hubs;
    } catch (error) {
      hubsCache.promise = null;
      return hubsCache.hubs.length > 0 ? hubsCache.hubs : []; // Stale fallback
    }
  })();

  return hubsCache.promise;
};
```

Cache invalidation on writes:
```typescript
sitemapVenueCache.venues = [];
sitemapVenueCache.timestamp = 0;
```

---

### Response Shapes

```typescript
// GET list → raw array
res.json(venues);

// GET single → raw object
res.json(venue);

// GET with pagination → object with metadata
res.json({ reviews, lastDoc: null });

// POST create → 201 with ID
res.status(201).json({ id: docRef.id, ...data });

// PUT update → 200 with updated data
res.json({ id, ...updatedData });

// DELETE → 204 no body
res.status(204).send();

// Error → object with error string
res.status(400).json({ error: "Message" });
```

---

## Path Aliases

| Alias | Resolves To | Used In |
|-------|------------|---------|
| `@/*` | `./frontend/*` | Frontend components, libs, hooks |
| `@shared/*` | `./shared/*` | Shared schema imports |
| `@assets/*` | `../attached_assets/*` | Static assets |

---

## Things That Catch AI Agents Off Guard

1. **Reviews are subcollections** — `venues/:venueId/reviews/:userId`, NOT a top-level `reviews` collection. The venue delete endpoint has a bug where it queries the wrong path.
2. **routes.ts is 6,221 lines** — all API logic in one file. Don't try to move things around without understanding the full file.
3. **Server cache expires at midnight** — not on a TTL. Individual venue fetches bypass the cache entirely.
4. **Admin list lives in Firestore** at `config/app` doc. It's read on EVERY admin-protected request with no caching.
5. **Drizzle ORM + PostgreSQL is configured but NOT used** — ignore `drizzle.config.ts` and the `migrations/` concept entirely.
6. **`storage.ts` MemStorage is unused** — all routes use Firestore directly.
7. **Frontend has dual caching** — server-side (memory + midnight expiry) AND client-side (localStorage + 8-hour TTL + promise dedup).
8. **Middleware spread operator** — admin auth uses `...requireAuthenticatedAdmin` spread syntax. It works but is non-standard Express.
9. **No tests exist** — zero test files, no test framework installed. Testing infrastructure is being set up.
10. **Two separate port servers in dev** — API on port 5000, frontend on port 3000. Both must be running.
