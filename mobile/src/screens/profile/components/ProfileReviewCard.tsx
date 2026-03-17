import { memo, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import type { UserReview } from '../../../types/user';

interface ProfileReviewCardProps {
  review: UserReview;
  onDelete: () => void;
  isDeleting: boolean;
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim();
}

function formatDate(createdAt?: string | Record<string, unknown>): string {
  if (!createdAt) return '';
  try {
    if (typeof createdAt === 'string') {
      return new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (typeof createdAt === 'object' && '_seconds' in createdAt) {
      return new Date((createdAt._seconds as number) * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Compact review card for the Profile screen.
 * Venue name is tappable (→ /venue/:id).
 * Long-press shows a delete confirmation Alert.
 * Text truncated to 3 lines with a "Show more" toggle.
 *
 * React.memo — renders inside FlashList (§9).
 */
export const ProfileReviewCard = memo(function ProfileReviewCard({
  review,
  onDelete,
  isDeleting,
}: ProfileReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const reviewText = review.text ? stripHtml(review.text) : '';
  const dateString = formatDate(review.createdAt);

  function handleLongPress(): void {
    Alert.alert(
      'Delete this review?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ],
    );
  }

  return (
    <Pressable
      className="px-5 py-4"
      style={({ pressed }) => ({ opacity: pressed || isDeleting ? 0.6 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={`Review for ${review.venueName}`}
      onLongPress={handleLongPress}
    >
      {/* Top row: venue name (link) + rating */}
      <View className="flex-row items-center justify-between mb-1">
        <Pressable
          className="flex-1 mr-2 py-1"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="link"
          accessibilityLabel={`Go to ${review.venueName}`}
          onPress={() => router.push(`/venue/${review.venueId}`)}
        >
          <Text className="text-base font-medium text-slate-900" numberOfLines={1}>
            {review.venueName}
          </Text>
        </Pressable>

        {/* Star rating */}
        <Text className="text-sm text-amber-500">
          {'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}
        </Text>
      </View>

      {/* Date */}
      {dateString.length > 0 && (
        <Text className="text-xs text-slate-400 mb-2">{dateString}</Text>
      )}

      {/* Review text */}
      {reviewText.length > 0 && (
        <>
          <Text
            className="text-sm text-slate-600 leading-relaxed"
            numberOfLines={expanded ? undefined : 3}
          >
            {reviewText}
          </Text>
          {reviewText.length > 120 && (
            <Pressable
              className="mt-1 py-1"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Show less' : 'Show more'}
              onPress={() => setExpanded((prev) => !prev)}
            >
              <Text className="text-xs font-medium text-blue-600">
                {expanded ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* Deleting indicator */}
      {isDeleting && (
        <Text className="text-xs text-slate-400 mt-1">Deleting…</Text>
      )}
    </Pressable>
  );
});
