import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitReview } from '../lib/venues';
import type { SubmitReviewRequest, SubmitReviewResponse } from '../types/review';

/**
 * Mutation hook for submitting a review.
 * POST /api/reviews — authenticated.
 * On success, invalidates the venue's review list so the new review appears.
 */
export function useSubmitReview(venueId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<SubmitReviewResponse, Error, SubmitReviewRequest>({
    mutationFn: (body: SubmitReviewRequest) => submitReview(body),
    onSuccess: () => {
      // Refresh the reviews list on the detail screen
      void queryClient.invalidateQueries({ queryKey: ['venues', venueId, 'reviews'] });
      // Refresh venue detail (rating/review count may have changed)
      void queryClient.invalidateQueries({ queryKey: ['venues', venueId] });
      // Refresh explore list — venue card may show updated rating
      void queryClient.invalidateQueries({ queryKey: ['venues', 'nearby'] });
    },
  });

  return {
    submitReview: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
