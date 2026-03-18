import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useSubmitReview } from '../../hooks/useSubmitReview';
import { StarRatingInput } from './components/StarRatingInput';
import { ReviewTextInput } from './components/ReviewTextInput';
import { THEME } from '../../constants/theme';
import type { Venue } from '../../types/venue';

const MIN_CHARS = 10;

interface WriteReviewScreenProps {
  venueId: string;
}

export default function WriteReviewScreen({ venueId }: WriteReviewScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { submitReview, isSubmitting } = useSubmitReview(venueId);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  // Pull venue name from cache (already fetched by VenueDetailScreen) — no extra query
  const cached = queryClient.getQueryData<Venue>(['venues', venueId]);
  const venueName = cached?.name ?? 'This Alley';

  // Auth guard — redirect to login if somehow reached unauthenticated
  if (!user) {
    router.replace('/auth/login');
    return null;
  }

  const hasContent = rating > 0 || text.trim().length > 0;

  const handleClose = useCallback(() => {
    if (hasContent) {
      Alert.alert(
        'Discard review?',
        'Your rating and text will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [hasContent]);

  const canSubmit = rating > 0 && text.trim().length >= MIN_CHARS && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      await submitReview({
        venueId,
        rating,
        text: text.trim(),
        userDisplayName: user.displayName ?? undefined,
      });

      Alert.alert('Review submitted!', 'Thanks for sharing your experience.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Submission failed', 'Please check your connection and try again.');
    }
  }, [canSubmit, submitReview, venueId, rating, text, user.displayName]);

  return (
    <View className="flex-1 bg-card" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* ── Modal header ─────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="p-1"
        >
          <Text className="text-base text-muted-foreground">✕</Text>
        </Pressable>

        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          Review
        </Text>

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Submit review"
          accessibilityState={{ disabled: !canSubmit }}
          className="px-4 py-2 rounded-lg bg-primary"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={THEME.colors.card} />
          ) : (
            <Text
              className="text-sm font-semibold"
              style={{ color: canSubmit ? THEME.colors.card : THEME.colors.primaryDisabled }}
            >
              Submit
            </Text>
          )}
        </Pressable>
      </View>

      {/* ── Form body ────────────────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Venue name */}
        <Text className="text-xl font-semibold text-foreground mb-1" numberOfLines={2}>
          {venueName}
        </Text>
        <Text className="text-sm text-muted-foreground mb-6">Write your review</Text>

        {/* Star rating */}
        <Text className="text-sm font-medium text-foreground mb-3">Your rating</Text>
        <StarRatingInput rating={rating} onChange={setRating} />
        {rating === 0 && (
          <Text className="text-xs text-muted-foreground mt-2">Tap a star to rate</Text>
        )}

        {/* Divider */}
        <View className="h-px bg-muted my-6" />

        {/* Review text */}
        <Text className="text-sm font-medium text-foreground mb-3">Your review</Text>
        <ReviewTextInput value={text} onChange={setText} />
        {text.trim().length > 0 && text.trim().length < MIN_CHARS && (
          <Text className="text-xs text-amber-500 mt-1">
            At least {MIN_CHARS} characters required
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
