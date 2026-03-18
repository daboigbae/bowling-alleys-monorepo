import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import type { Venue } from '../../../types/venue';

const CARD_IMAGE_HEIGHT = 160;

interface VenueCardProps {
  venue: Venue;
  onPress: () => void;
}

/**
 * Venue list card — §5 card pattern.
 *
 * Layout: image (160pt, explicit dimensions) → body (p-4).
 * Shadow wrapper + inner overflow-hidden container to preserve both
 * iOS shadow and top-corner image clipping.
 */
export function VenueCard({ venue, onPress }: VenueCardProps) {
  const imageUri = venue.coverImageUrl ?? venue.imageUrls?.[0] ?? null;
  const displayRating = venue.googleRating ?? venue.avgRating ?? null;
  const reviewCount = venue.reviewCount ?? 0;

  return (
    // Outer wrapper: shadow lives here so overflow:hidden on inner doesn't clip it
    <View
      className="rounded-xl bg-card mb-4"
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Pressable
        className="rounded-xl overflow-hidden"
        style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${venue.name}`}
        onPress={onPress}
      >
        {/* Image with distance badge overlay */}
        <View style={{ height: CARD_IMAGE_HEIGHT }}>
          {imageUri !== null ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: CARD_IMAGE_HEIGHT }}
              resizeMode="cover"
            />
          ) : (
            // Placeholder block for missing/failed image — §9
            <View style={{ width: '100%', height: CARD_IMAGE_HEIGHT }} className="bg-shimmer" />
          )}

          {/* Distance badge — top-right overlay */}
          {venue.distance !== undefined && (
            <View className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1">
              <Text className="text-xs text-white font-medium">
                {venue.distance.toFixed(1)} mi
              </Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View className="p-4">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {venue.name}
          </Text>

          <Text className="text-sm text-muted-foreground mt-0.5" numberOfLines={1}>
            {[venue.city, venue.state].filter(Boolean).join(', ')}
          </Text>

          {displayRating !== null && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="star" size={14} color={THEME.colors.warning} />
              <Text className="text-sm text-foreground ml-1 font-medium">
                {displayRating.toFixed(1)}
              </Text>
              <Text className="text-sm text-muted-foreground ml-1">({reviewCount})</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
