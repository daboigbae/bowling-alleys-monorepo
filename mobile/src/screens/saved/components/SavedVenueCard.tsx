import { memo, useRef, useCallback } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unsaveVenue } from '../../../lib/venues';
import type { Venue } from '../../../types/venue';

interface SavedVenueCardProps {
  venue: Venue;
  userId: string;
}

/**
 * Horizontal venue card for the Saved tab.
 * Layout: 64×64 thumbnail | venue name + city/state.
 * Swipe left to reveal a red "Remove" action.
 *
 * React.memo — renders inside FlashList, avoids unnecessary re-renders (§9).
 */
export const SavedVenueCard = memo(function SavedVenueCard({
  venue,
  userId,
}: SavedVenueCardProps) {
  const queryClient = useQueryClient();
  const swipeableRef = useRef<Swipeable>(null);

  const mutation = useMutation({
    mutationKey: ['unsave', userId, venue.id],
    mutationFn: () => unsaveVenue(userId, venue.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-alleys', userId] });
    },
  });

  const handleRemove = useCallback(() => {
    swipeableRef.current?.close();
    mutation.mutate();
  }, [mutation]);

  const renderRightActions = useCallback(
    () => (
      // Exception: fixed pixel width for swipe action panel — no NativeWind equivalent
      <View style={{ width: 80 }}>
        <Pressable
          className="flex-1 bg-red-500 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${venue.name} from saved`}
          onPress={handleRemove}
        >
          <Text className="text-white text-sm font-semibold">Remove</Text>
        </Pressable>
      </View>
    ),
    [handleRemove, venue.name],
  );

  const imageUri = venue.coverImageUrl ?? venue.imageUrls?.[0] ?? null;

  const subtitle =
    venue.city && venue.state
      ? `${venue.city}, ${venue.state}`
      : venue.city ?? venue.state ?? venue.address ?? '';

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} friction={2}>
      <Pressable
        className="flex-row items-center px-4 py-3 bg-card"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        accessibilityRole="button"
        accessibilityLabel={`View ${venue.name}`}
        onPress={() => router.push(`/venue/${venue.id}`)}
      >
        {/* Thumbnail — explicit dimensions required to prevent layout shift (§9) */}
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="rounded-lg bg-muted"
            style={{ width: 64, height: 64 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="rounded-lg bg-muted items-center justify-center"
            style={{ width: 64, height: 64 }}
          >
            <Text className="text-2xl">🎳</Text>
          </View>
        )}

        {/* Text content */}
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {venue.name}
          </Text>
          {subtitle.length > 0 && (
            <Text className="text-sm text-muted-foreground mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {venue.avgRating != null && venue.avgRating > 0 && (
            <Text className="text-xs text-muted-foreground mt-0.5">
              {'★ ' + venue.avgRating.toFixed(1)}
            </Text>
          )}
        </View>

        {/* Chevron — visual affordance */}
        <Text className="text-border text-lg ml-2">›</Text>
      </Pressable>
    </Swipeable>
  );
});
