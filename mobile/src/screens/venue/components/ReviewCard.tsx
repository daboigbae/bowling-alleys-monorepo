import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Review } from '../../../types/review';

/** Strip HTML tags from user-submitted review text (Rule 11 / audit W4). */
function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim();
}

/** Format a Firestore createdAt value to a readable date string. */
function formatDate(createdAt: Review['createdAt']): string {
  if (createdAt === undefined || createdAt === null) return '';
  try {
    const date =
      typeof createdAt === 'string'
        ? new Date(createdAt)
        : typeof createdAt === 'object' && '_seconds' in createdAt
        ? new Date((createdAt as { _seconds: number })._seconds * 1000)
        : null;
    if (date === null || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface ReviewCardProps {
  review: Review;
}

/**
 * Single review display — §5 card pattern.
 * Layout: author + date row → star rating → review text.
 * Separated by a 1pt line (rendered by ReviewsList between items, not on the card).
 * Shows full review text — this is a detail screen, no truncation.
 */
export function ReviewCard({ review }: ReviewCardProps) {
  const authorName = review.userDisplayName ?? 'Anonymous';
  const dateStr = formatDate(review.createdAt);
  const bodyText = review.text !== undefined ? stripHtml(review.text) : '';

  return (
    <View className="px-5 py-4">
      {/* Author + date */}
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-base font-semibold text-slate-900">{authorName}</Text>
        {dateStr.length > 0 && (
          <Text className="text-sm text-slate-400">{dateStr}</Text>
        )}
      </View>

      {/* Star rating */}
      <View className="flex-row items-center mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < review.rating ? 'star' : 'star-outline'}
            size={14}
            color="#F59E0B"
          />
        ))}
      </View>

      {/* Review body — full text, HTML stripped */}
      {bodyText.length > 0 && (
        <Text className="text-base text-slate-700 leading-relaxed">{bodyText}</Text>
      )}
    </View>
  );
}
