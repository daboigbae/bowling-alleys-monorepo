/**
 * Review shape returned by GET /api/venues/:venueId/reviews
 * Response envelope: { reviews: Review[], lastDoc: null }
 * Derived from server ReviewData interface (routes.ts line 194).
 */
export interface Review {
  id: string;
  rating: number;
  /** User-submitted text. May contain raw HTML — strip before rendering. */
  text?: string;
  userId: string;
  userDisplayName?: string;
  /** Firestore Timestamp — serialised as string or object over HTTP */
  createdAt?: string | Record<string, unknown>;
}

/** Envelope returned by GET /api/venues/:venueId/reviews */
export interface ReviewsResponse {
  reviews: Review[];
  lastDoc: null;
}

/** Body sent to POST /api/reviews */
export interface SubmitReviewRequest {
  venueId: string;
  rating: number;
  text?: string;
  userDisplayName?: string;
}

/** Response from POST /api/reviews (201) */
export interface SubmitReviewResponse {
  success: true;
}
