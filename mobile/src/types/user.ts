/**
 * User profile stored in Firestore — returned by GET /api/users/:userId
 */
export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  createdAt?: string | Record<string, unknown>;
  updatedAt?: string | Record<string, unknown>;
}

/**
 * Review object returned by GET /api/reviews/user/:userId
 * Each item is enriched server-side with venueId + venueName from the parent venue doc.
 * id = Firestore document ID (userId — one review per user per venue by design).
 */
export interface UserReview {
  id: string;
  venueId: string;
  venueName: string;
  venueCity?: string;
  venueState?: string;
  rating: number;
  /** May contain raw HTML — strip before rendering (Rule 11) */
  text?: string;
  userId: string;
  userDisplayName?: string;
  createdAt?: string | Record<string, unknown>;
}

/** Body for PUT /api/users/:userId */
export interface UpdateProfileRequest {
  displayName?: string;
}

/** Response from PUT /api/users/:userId */
export interface UpdateProfileResponse {
  id: string;
  displayName?: string;
  updatedAt?: Record<string, unknown>;
}
