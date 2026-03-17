import { request } from './api';
import type { Venue } from '../types/venue';
import type { ReviewsResponse, SubmitReviewRequest, SubmitReviewResponse } from '../types/review';

/**
 * Fetches bowling alleys near the given coordinates.
 * Calls GET /api/venues/by-proximity?lat=&lng=&radius=
 * Returns up to 9 venues sorted by distance (miles).
 */
export async function fetchNearbyVenues(
  lat: number,
  lng: number,
  radius = 10,
): Promise<Venue[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  });
  return request<undefined, Venue[]>('GET', `/api/venues/by-proximity?${params.toString()}`);
}

/**
 * Fetches a single venue by ID.
 * GET /api/venues/:id
 * Returns the Venue object, or throws if 404/error.
 */
export async function fetchVenueById(venueId: string): Promise<Venue> {
  return request<undefined, Venue>('GET', `/api/venues/${venueId}`);
}

/**
 * Fetches reviews for a venue.
 * GET /api/venues/:venueId/reviews
 * Returns envelope { reviews: Review[], lastDoc: null } — callers must unwrap .reviews.
 */
export async function fetchVenueReviews(venueId: string): Promise<ReviewsResponse> {
  return request<undefined, ReviewsResponse>('GET', `/api/venues/${venueId}/reviews`);
}

/**
 * Saves a venue to the authenticated user's saved alleys.
 * POST /api/users/:userId/saved-alleys/:venueId
 * Requires Bearer token auth.
 */
export async function saveVenue(userId: string, venueId: string): Promise<{ success: boolean }> {
  return request<undefined, { success: boolean }>(
    'POST',
    `/api/users/${userId}/saved-alleys/${venueId}`,
    undefined,
    true, // authenticated
  );
}

/**
 * Removes a venue from the authenticated user's saved alleys.
 * DELETE /api/users/:userId/saved-alleys/:venueId
 * Returns null (204 No Content).
 */
export async function unsaveVenue(userId: string, venueId: string): Promise<void> {
  await request<undefined, null>(
    'DELETE',
    `/api/users/${userId}/saved-alleys/${venueId}`,
    undefined,
    true, // authenticated
  );
}

/**
 * Submits a review for a venue.
 * POST /api/reviews
 * Requires Bearer token auth. Returns { success: true } on 201.
 * Server uses userId as doc ID — one review per user per venue (create-or-update).
 */
export async function submitReview(body: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  return request<SubmitReviewRequest, SubmitReviewResponse>(
    'POST',
    '/api/reviews',
    body,
    true, // authenticated
  );
}
