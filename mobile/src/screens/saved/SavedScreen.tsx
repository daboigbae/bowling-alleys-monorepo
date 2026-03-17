import { View, Text, Pressable, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../../hooks/useAuth';
import { useSavedVenues } from '../../hooks/useSavedVenues';
import { SavedVenueCard } from './components/SavedVenueCard';
import { SavedEmptyState } from './components/SavedEmptyState';
import type { Venue } from '../../types/venue';

/** Skeleton placeholder for a single saved venue card while loading */
function SavedCardSkeleton(): JSX.Element {
  return (
    <View className="flex-row items-center px-4 py-3">
      {/* Thumbnail placeholder */}
      <View className="rounded-lg bg-slate-200" style={{ width: 64, height: 64 }} />
      <View className="flex-1 ml-3">
        <View className="h-4 bg-slate-200 rounded mb-2 w-3/4" />
        <View className="h-3 bg-slate-200 rounded w-1/2" />
      </View>
    </View>
  );
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();

  const { venues, isLoading, isError, refetch } = useSavedVenues(user?.uid ?? null);

  // ── Header ───────────────────────────────────────────────────────────────

  const header = (
    <View className="px-5 pt-4 pb-3">
      <Text className="text-2xl font-bold text-slate-900">Saved</Text>
    </View>
  );

  // ── Unauthenticated ──────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        {header}
        <SavedEmptyState variant="unauthenticated" />
      </View>
    );
  }

  // ── Loading (auth resolving or initial fetch) ────────────────────────────
  // authLoading guard prevents flash of empty/unauthenticated state on app restore.

  if (authLoading || isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        {header}
        <SavedCardSkeleton />
        <View className="h-px bg-slate-100 mx-4" />
        <SavedCardSkeleton />
        <View className="h-px bg-slate-100 mx-4" />
        <SavedCardSkeleton />
        <View className="h-px bg-slate-100 mx-4" />
        <SavedCardSkeleton />
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        {header}
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-slate-500 text-center mb-4">
            Couldn't load your saved alleys.
          </Text>
          <Pressable
            className="px-6 h-11 rounded-xl bg-slate-100 items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={() => void refetch()}
          >
            <Text className="text-base font-medium text-slate-700">Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Loaded — empty ────────────────────────────────────────────────────────

  if (venues.length === 0) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        {header}
        <SavedEmptyState variant="empty" />
      </View>
    );
  }

  // ── Loaded — has venues ───────────────────────────────────────────────────

  const userId = user!.uid;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      {header}
      <FlashList
        data={venues}
        keyExtractor={(item: Venue) => item.id}
        estimatedItemSize={80}
        renderItem={({ item }: { item: Venue }) => (
          <SavedVenueCard venue={item} userId={userId} />
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-slate-100 mx-4" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
          />
        }
      />
    </View>
  );
}
