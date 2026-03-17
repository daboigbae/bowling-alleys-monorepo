import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveVenue, unsaveVenue } from '../lib/venues';
import * as Haptics from 'expo-haptics';

interface UseSaveVenueParams {
  userId: string | null;
  venueId: string;
}

export interface UseSaveVenueResult {
  /** Whether the venue is saved — optimistic. Defaults false until T-07 cache is populated. */
  isSaved: boolean;
  /** Toggle save/unsave with haptic feedback */
  toggleSave: () => void;
  isMutating: boolean;
}

/**
 * Mutation hook for saving / unsaving a venue.
 *
 * Save state is optimistic: starts as false (unfilled), toggled on tap.
 * On success, invalidates ['saved-alleys', userId] so T-07 Saved Alleys tab
 * stays in sync when built.
 *
 * Requires authenticated user — callers should only mount this when userId is non-null.
 */
export function useSaveVenue({ userId, venueId }: UseSaveVenueParams): UseSaveVenueResult {
  const queryClient = useQueryClient();

  // Optimistic saved state — starts false; T-07 will hydrate this from cache.
  // When T-07 is built, query the ['saved-alleys', userId] cache here to derive
  // the initial isSaved value.
  const savedAlleysData = queryClient.getQueryData<Array<{ id: string }>>([
    'saved-alleys',
    userId,
  ]);
  const isSaved = savedAlleysData?.some((v) => v.id === venueId) ?? false;

  const saveMutation = useMutation({
    mutationFn: () => saveVenue(userId!, venueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-alleys', userId] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => unsaveVenue(userId!, venueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-alleys', userId] });
    },
  });

  function toggleSave(): void {
    if (userId === null) return;

    // Haptic feedback — wrap in try/catch per Platform Knowledge
    void (async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics not available — continue silently
      }
    })();

    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  }

  return {
    isSaved,
    toggleSave,
    isMutating: saveMutation.isPending || unsaveMutation.isPending,
  };
}
