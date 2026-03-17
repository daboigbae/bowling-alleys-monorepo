import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingInputProps {
  rating: number;
  onChange: (rating: number) => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * 5-star tap-to-rate input.
 * Each star is an accessible radio button (accessibilityRole="radio").
 * Filled stars rendered in amber (#F59E0B), empty in slate (#CBD5E1).
 */
export function StarRatingInput({ rating, onChange }: StarRatingInputProps) {
  return (
    <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="Rating">
      {STARS.map((star) => (
        <Pressable
          key={star}
          accessibilityRole="radio"
          accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
          accessibilityState={{ checked: rating === star }}
          onPress={() => onChange(star)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={36}
            color={star <= rating ? '#F59E0B' : '#CBD5E1'}
          />
        </Pressable>
      ))}
    </View>
  );
}
