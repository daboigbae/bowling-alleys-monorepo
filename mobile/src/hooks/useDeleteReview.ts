import { useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '../lib/api';

interface DeleteReviewVariables {
  venueId: string;
}

/**
 * Mutation hook for deleting the authenticated user's review for a venue.
 * DELETE /api/reviews/:venueId — authenticated.
 *
 * Path param is venueId (not a reviewId). This is by design: the server stores
 * one review per user per venue (doc ID = userId), so venueId + Bearer token
 * uniquely identify the review to delete.
 *
 * Returns 204 No Content — handled by the 204 guard in api.ts.
 *
 * On success, invalidates:
 *   - ['users', userId, 'reviews']      — user's review list on profile screen
 *   - ['venues', venueId, 'reviews']    — venue's review list on detail screen
 *   - ['venues', venueId]               — venue detail (avgRating/reviewCount changed)
 */
export function useDeleteReview(userId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, DeleteReviewVariables>({
    mutationFn: ({ venueId }: DeleteReviewVariables) =>
      request<undefined, void>('DELETE', `/api/reviews/${venueId}`, undefined, true),
    onSuccess: (_data, { venueId }) => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId, 'reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['venues', venueId, 'reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['venues', venueId] });
    },
  });

  return {
    deleteReview: mutation.mutateAsync,
    isDeletingVenueId: mutation.isPending ? (mutation.variables?.venueId ?? null) : null,
  };
}
