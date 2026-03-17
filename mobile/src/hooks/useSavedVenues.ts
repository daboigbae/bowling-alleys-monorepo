import { useQuery } from '@tanstack/react-query';
import { request } from '../lib/api';
import type { Venue } from '../types/venue';

export interface UseSavedVenuesResult {
  venues: Venue[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * TanStack Query hook for GET /api/users/:userId/saved-alleys.
 * Query key: ['saved-alleys', userId] — MUST match the key used by useSaveVenue
 * so that the Venue Detail save button stays in sync with this list.
 *
 * Disabled when userId is null — never fires unauthenticated (would 401).
 * Returns plain Venue[] (no envelope wrapper — confirmed from routes.ts:5321).
 */
export function useSavedVenues(userId: string | null): UseSavedVenuesResult {
  const query = useQuery({
    queryKey: ['saved-alleys', userId],
    queryFn: () =>
      request<undefined, Venue[]>(
        'GET',
        `/api/users/${userId!}/saved-alleys`,
        undefined,
        true, // authenticated
      ),
    enabled: !!userId,
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
