import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useVenueDetail } from '../../hooks/useVenueDetail';
import { useVenueReviews } from '../../hooks/useVenueReviews';
import { useSaveVenue } from '../../hooks/useSaveVenue';
import { VenueHeroHeader } from './components/VenueHeroHeader';
import { VenueInfoSection } from './components/VenueInfoSection';
import { AmenitiesSection } from './components/AmenitiesSection';
import { ReviewsList } from './components/ReviewsList';
import { THEME } from '../../constants/theme';

interface VenueDetailScreenProps {
  venueId: string;
}

/** Skeleton placeholder for venue info while loading */
function VenueInfoSkeleton(): JSX.Element {
  return (
    <View className="px-5 pt-5 pb-3">
      <View className="h-7 bg-shimmer rounded mb-2 w-3/4" />
      <View className="h-4 bg-shimmer rounded mb-4 w-1/2" />
      <View className="h-px bg-muted mb-4" />
      <View className="h-4 bg-shimmer rounded mb-3 w-full" />
      <View className="h-4 bg-shimmer rounded w-2/3" />
    </View>
  );
}

export default function VenueDetailScreen({ venueId }: VenueDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Parallel queries — both fire simultaneously, not sequential (AC 10)
  const { venue, isLoading: venueLoading, isError: venueError, refetch: refetchVenue } = useVenueDetail(venueId);
  const { reviews, isLoading: reviewsLoading, isError: reviewsError } = useVenueReviews(venueId);

  const { isSaved, toggleSave, isMutating } = useSaveVenue({
    userId: user?.uid ?? null,
    venueId,
  });

  const imageUri = venue?.coverImageUrl ?? venue?.imageUrls?.[0] ?? null;

  // ── Venue 404 / not found ────────────────────────────────────────────────

  if (venueError && !venueLoading) {
    return (
      <View className="flex-1 bg-card items-center justify-center px-5" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <Text className="text-xl font-semibold text-foreground text-center mb-2">Venue not found</Text>
        <Text className="text-base text-muted-foreground text-center mb-6">
          This alley may have been removed or the link is invalid.
        </Text>
        <Pressable
          className="h-11 px-5 items-center justify-center rounded-xl bg-muted"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Text className="text-base font-medium text-foreground">← Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Full screen loading (initial venue fetch) ────────────────────────────

  if (venueLoading && venue === undefined) {
    return (
      <View className="flex-1 bg-card" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        {/* Hero placeholder */}
        <View style={{ height: 240 }} className="bg-shimmer" />
        <VenueInfoSkeleton />
      </View>
    );
  }

  // ── Venue load error (not 404) ───────────────────────────────────────────

  if (venueError) {
    return (
      <View className="flex-1 bg-card items-center justify-center px-5">
        <StatusBar style="dark" />
        <Text className="text-xl font-semibold text-foreground text-center mb-2">
          Something went wrong
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-6">
          We couldn't load this venue. Please try again.
        </Text>
        <Pressable
          className="bg-primary px-6 h-12 items-center justify-center rounded-xl"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={() => void refetchVenue()}
        >
          <Text className="text-base font-semibold text-primary-foreground">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (venue === undefined) {
    return (
      <View className="flex-1 bg-card items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────

  const listHeader = (
    <>
      {/* Hero header — contains back + save overlay buttons */}
      <VenueHeroHeader
        imageUri={imageUri}
        isSaved={isSaved}
        showSaveButton={user !== null}
        isSaving={isMutating}
        onToggleSave={toggleSave}
      />

      {/* Venue metadata */}
      <VenueInfoSection venue={venue} />

      {/* Amenities chips — renders nothing when empty */}
      <AmenitiesSection amenities={venue.amenities ?? []} />

      {/* Divider + Reviews section title */}
      <View className="h-px bg-muted mx-5" />
      <View className="px-5 pt-4 pb-1">
        <Text className="text-xl font-semibold text-foreground">Reviews</Text>
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-card">
      {/* Light StatusBar — hero image is behind it */}
      <StatusBar style="light" />

      <ReviewsList
        reviews={reviews}
        isLoading={reviewsLoading}
        isError={reviewsError}
        ListHeaderComponent={listHeader}
      />

      {/* Write Review FAB — authenticated users only — §5 FAB spec */}
      {user !== null && (
        // Exception: dynamic bottom offset from safe area — no NativeWind equivalent
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 24,
            right: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Pressable
            className="w-14 h-14 rounded-full bg-primary items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Write a review"
            onPress={() => router.push(`/venue/${venueId}/review`)}
          >
            <Ionicons name="create-outline" size={26} color={THEME.colors.card} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
