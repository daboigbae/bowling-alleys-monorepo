import { request } from './api';
import type { Venue } from '../types/venue';

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
