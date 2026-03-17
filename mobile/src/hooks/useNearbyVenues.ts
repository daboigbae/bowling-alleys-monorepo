import { useQuery } from '@tanstack/react-query';
import { fetchNearbyVenues } from '../lib/venues';
import type { Venue } from '../types/venue';

interface UseNearbyVenuesParams {
  lat: number | null;
  lng: number | null;
  radius?: number;
}

export interface UseNearbyVenuesResult {
  venues: Venue[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * TanStack Query hook for GET /api/venues/by-proximity.
 * Disabled until lat + lng are both non-null.
 * staleTime: 5 minutes — proximity results do not change frequently.
 */
export function useNearbyVenues({
  lat,
  lng,
  radius = 10,
}: UseNearbyVenuesParams): UseNearbyVenuesResult {
  const enabled = lat !== null && lng !== null;

  const query = useQuery({
    queryKey: ['venues', 'nearby', lat, lng, radius],
    queryFn: () => fetchNearbyVenues(lat!, lng!, radius),
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  return {
    venues: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}
