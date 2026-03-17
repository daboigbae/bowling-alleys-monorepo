import { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUserReviews } from '../../hooks/useUserReviews';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { useDeleteReview } from '../../hooks/useDeleteReview';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileReviewCard } from './components/ProfileReviewCard';
import { EditDisplayNameSheet } from './components/EditDisplayNameSheet';
import type { UserReview } from '../../types/user';

/** Skeleton for the profile header area while loading */
function ProfileHeaderSkeleton(): JSX.Element {
  return (
    <View className="items-center mt-6 mb-2 px-5">
      <View className="rounded-full bg-slate-200" style={{ width: 72, height: 72 }} />
      <View className="h-5 bg-slate-200 rounded mt-4 mb-2 w-40" />
      <View className="h-3 bg-slate-200 rounded w-32" />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [editSheetVisible, setEditSheetVisible] = useState(false);

  const userId = user?.uid ?? null;

  const { profile, isLoading: profileLoading, refetch: refetchProfile } = useUserProfile(userId);
  const { reviews, isLoading: reviewsLoading, refetch: refetchReviews } = useUserReviews(userId);
  const [refreshing, setRefreshing] = useState(false);
  const { updateProfile, isUpdating } = useUpdateProfile(userId ?? '');
  const { deleteReview, isDeletingVenueId } = useDeleteReview(userId ?? '');

  const displayName = profile?.displayName ?? user?.displayName ?? '';
  const email = user?.email ?? profile?.email ?? '';

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchReviews()]);
    setRefreshing(false);
  }, [refetchProfile, refetchReviews]);

  // ── Sign out ──────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await signOut();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Sign out failed';
      Alert.alert('Error', msg);
    }
  }, [signOut]);

  // ── Save display name ─────────────────────────────────────────────────────

  const handleSaveName = useCallback(async (newName: string): Promise<void> => {
    try {
      await updateProfile({ displayName: newName });
      setEditSheetVisible(false);
      Alert.alert('Saved', 'Your display name has been updated.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update name';
      Alert.alert('Error', msg);
    }
  }, [updateProfile]);

  // ── Delete review ─────────────────────────────────────────────────────────

  const handleDeleteReview = useCallback(async (venueId: string): Promise<void> => {
    try {
      await deleteReview({ venueId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete review';
      Alert.alert('Error', msg);
    }
  }, [deleteReview]);

  // ── Unauthenticated ───────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-2xl font-bold text-slate-900 mb-2 text-center">Profile</Text>
          <Text className="text-base text-slate-500 mb-8 text-center leading-relaxed">
            Sign in to save your favorite alleys and write reviews.
          </Text>
          <Pressable
            className="w-full h-12 rounded-xl bg-blue-600 items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            onPress={() => router.push('/auth/login')}
          >
            <Text className="text-base font-semibold text-white">Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (authLoading || profileLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <ProfileHeaderSkeleton />
        <View className="h-px bg-slate-100 mx-4 my-4" />
        <View className="px-5 py-4">
          <View className="h-4 bg-slate-200 rounded w-24 mb-3" />
          <View className="h-16 bg-slate-100 rounded" />
        </View>
      </View>
    );
  }

  // ── Loaded ────────────────────────────────────────────────────────────────

  const listHeader = (
    <>
      <ProfileHeader
        displayName={displayName}
        email={email}
        photoURL={user?.photoURL}
        onEditPress={() => setEditSheetVisible(true)}
      />

      {/* Divider */}
      <View className="h-px bg-slate-100 mx-4 my-4" />

      {/* Reviews section title */}
      <View className="px-5 pb-1">
        <Text className="text-xl font-semibold text-slate-900">My Reviews</Text>
      </View>
    </>
  );

  const listFooter = (
    <>
      {/* Reviews empty state */}
      {!reviewsLoading && reviews.length === 0 && (
        <View className="px-5 py-6">
          <Text className="text-base text-slate-400">No reviews yet.</Text>
        </View>
      )}

      {/* Sign Out — bottom of scroll */}
      <View className="mx-4 mt-6" style={{ marginBottom: insets.bottom + 24 }}>
        <Pressable
          className="w-full h-12 rounded-xl border border-red-200 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => void handleSignOut()}
        >
          <Text className="text-base font-medium text-red-500">Sign Out</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <FlashList
        data={reviews}
        keyExtractor={(item: UserReview) => item.venueId}
        estimatedItemSize={100}
        renderItem={({ item }: { item: UserReview }) => (
          <ProfileReviewCard
            review={item}
            onDelete={() => void handleDeleteReview(item.venueId)}
            isDeleting={isDeletingVenueId === item.venueId}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-slate-100 mx-5" />}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing}
        contentContainerStyle={{ paddingBottom: 0 }}
      />

      <EditDisplayNameSheet
        visible={editSheetVisible}
        currentName={displayName}
        isSaving={isUpdating}
        onSave={(name) => void handleSaveName(name)}
        onClose={() => setEditSheetVisible(false)}
      />
    </View>
  );
}
