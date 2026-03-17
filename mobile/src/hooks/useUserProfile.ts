import { useQuery } from '@tanstack/react-query';
import { request } from '../lib/api';
import type { UserProfile } from '../types/user';

/**
 * Fetches the Firestore user profile for the authenticated user.
 * GET /api/users/:userId — public endpoint, no auth header required.
 * Disabled when userId is null.
 */
export function useUserProfile(userId: string | null) {
  const query = useQuery({
    queryKey: ['users', userId],
    queryFn: () => request<undefined, UserProfile>('GET', `/api/users/${userId!}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: async () => {
      await query.refetch();
    },
  };
}
