import { View, Text, ScrollView } from 'react-native';

interface AmenitiesSectionProps {
  amenities: string[];
}

/**
 * Horizontal scrolling amenity chips.
 * Renders nothing when the list is empty (no placeholder row).
 * Chip style: rounded-full, py-1 px-3, border, text-xs — §5.
 */
export function AmenitiesSection({ amenities }: AmenitiesSectionProps) {
  if (amenities.length === 0) return null;

  return (
    <View className="px-5 pb-4">
      <Text className="text-base font-semibold text-foreground mb-3">Amenities</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {amenities.map((amenity) => (
          <View
            key={amenity}
            className="border border-border rounded-full py-1 px-3"
          >
            <Text className="text-xs text-foreground">{amenity}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
