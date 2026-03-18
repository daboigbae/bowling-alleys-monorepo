import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExploreHeader } from './components/ExploreHeader';
import { LocationPermissionGate, type Coords } from './components/LocationPermissionGate';
import { VenueCard } from './components/VenueCard';
import { VenueMapView } from './components/VenueMapView';
import { useNearbyVenues } from '../../hooks/useNearbyVenues';
import type { Venue } from '../../types/venue';

type ViewMode = 'list' | 'map';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card — shimmer pulse animation while venues are loading
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard(): JSX.Element {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }} className="rounded-xl mb-4 overflow-hidden">
      <View className="bg-slate-200 rounded-t-xl" style={{ height: 160 }} />
      <View className="p-4 bg-white rounded-b-xl">
        <View className="h-4 bg-slate-200 rounded mb-2 w-3/4" />
        <View className="h-3 bg-slate-200 rounded mb-3 w-1/2" />
        <View className="h-3 bg-slate-200 rounded w-1/4" />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VenueContent — rendered by LocationPermissionGate once coords are available
// ─────────────────────────────────────────────────────────────────────────────

interface VenueContentProps {
  coords: Coords;
  viewMode: ViewMode;
}

function VenueContent({ coords, viewMode }: VenueContentProps): JSX.Element {
  const { venues, isLoading, isError, error, refetch } = useNearbyVenues({
    lat: coords.lat,
    lng: coords.lng,
    radius: 10,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh(): Promise<void> {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  // Map view — full bleed, no padding
  if (viewMode === 'map') {
    return <VenueMapView venues={venues} userLocation={coords} />;
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <View className="flex-1 px-5 pt-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-xl font-semibold text-slate-900 text-center mb-2">
          Couldn't load alleys
        </Text>
        <Text className="text-base text-slate-500 text-center mb-6">
          {error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Pressable
          className="bg-[#d42330] px-6 h-12 items-center justify-center rounded-xl"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={() => void refetch()}
        >
          <Text className="text-base font-semibold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (venues.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-xl font-semibold text-slate-900 text-center mb-2">
          No alleys nearby
        </Text>
        <Text className="text-base text-slate-500 text-center">
          No alleys nearby. Try increasing your search radius.
        </Text>
      </View>
    );
  }

  // Venue list
  return (
    <FlashList
      data={venues}
      keyExtractor={(item: Venue) => item.id}
      estimatedItemSize={120}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
      renderItem={({ item }: { item: Venue }) => (
        <VenueCard
          venue={item}
          onPress={() => router.push(`/venue/${item.id}`)}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor="#d42330"
        />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExploreScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function ExploreScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ExploreHeader viewMode={viewMode} onViewModeChange={setViewMode} />
      <LocationPermissionGate>
        {(coords) => <VenueContent coords={coords} viewMode={viewMode} />}
      </LocationPermissionGate>
    </View>
  );
}
