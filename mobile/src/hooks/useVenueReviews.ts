import { useQuery } from '@tanstack/react-query';
import { fetchVenueReviews } from '../lib/venues';
import type { Review } from '../types/review';

export interface UseVenueReviewsResult {
  reviews: Review[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * TanStack Query hook for GET /api/venues/:venueId/reviews.
 * Unwraps the { reviews, lastDoc } envelope.
 * staleTime: 5 minutes.
 */
export function useVenueReviews(venueId: string): UseVenueReviewsResult {
  const query = useQuery({
    queryKey: ['venues', venueId, 'reviews'],
    queryFn: async () => {
      const response = await fetchVenueReviews(venueId);
      return response.reviews;
    },
    staleTime: 1000 * 60 * 5,
    enabled: venueId.length > 0,
  });

  return {
    reviews: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}
