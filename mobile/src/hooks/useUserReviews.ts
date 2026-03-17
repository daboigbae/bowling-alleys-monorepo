import { useQuery } from '@tanstack/react-query';
import { request } from '../lib/api';
import type { UserReview } from '../types/user';

/**
 * Fetches reviews written by the authenticated user.
 * GET /api/reviews/user/:userId — public endpoint, no auth required.
 * Returns plain UserReview[] (no envelope).
 * Disabled when userId is null.
 *
 * Query key: ['users', userId, 'reviews']
 * Invalidate this key after a review is deleted from the profile screen.
 */
export function useUserReviews(userId: string | null) {
  const query = useQuery({
    queryKey: ['users', userId, 'reviews'],
    queryFn: () =>
      request<undefined, UserReview[]>('GET', `/api/reviews/user/${userId!}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    reviews: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: async () => {
      await query.refetch();
    },
  };
}
