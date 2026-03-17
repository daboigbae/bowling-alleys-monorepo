import { useQuery } from '@tanstack/react-query';
import { fetchVenueById } from '../lib/venues';
import type { Venue } from '../types/venue';

export interface UseVenueDetailResult {
  venue: Venue | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * TanStack Query hook for GET /api/venues/:id.
 * staleTime: 5 minutes — venue data changes infrequently.
 */
export function useVenueDetail(venueId: string): UseVenueDetailResult {
  const query = useQuery({
    queryKey: ['venues', venueId],
    queryFn: () => fetchVenueById(venueId),
    staleTime: 1000 * 60 * 5,
    enabled: venueId.length > 0,
  });

  return {
    venue: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}
