/**
 * Venue shape returned by GET /api/venues/by-proximity
 * Derived from the server's VenueData (routes.ts) and the web Venue interface
 * (frontend/lib/firestore.ts).
 */
export interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  lanes?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  /** Legacy coordinate fields — fallback when location object is absent */
  lat?: number;
  lng?: number;
  isActive?: boolean;
  amenities?: string[];
  avgRating?: number;
  reviewCount?: number;
  googleRating?: number;
  /** Miles from user — appended by the by-proximity endpoint */
  distance?: number;
}
