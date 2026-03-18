import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Venue } from '../../../types/venue';

interface VenueInfoSectionProps {
  venue: Venue;
}

/**
 * Venue metadata: name, city/state, rating, address, phone, website.
 * Rows with undefined/null values are omitted entirely — no "undefined" renders.
 */
export function VenueInfoSection({ venue }: VenueInfoSectionProps) {
  const displayRating = venue.googleRating ?? venue.avgRating ?? null;
  const reviewCount = venue.reviewCount ?? 0;
  const cityState = [venue.city, venue.state].filter(Boolean).join(', ');

  return (
    <View className="px-5 pt-5 pb-3">
      {/* Venue name */}
      <Text className="text-2xl font-bold text-slate-900 leading-tight">{venue.name}</Text>

      {/* City / state */}
      {cityState.length > 0 && (
        <Text className="text-base text-slate-500 mt-1">{cityState}</Text>
      )}

      {/* Star rating */}
      {displayRating !== null && (
        <View className="flex-row items-center mt-2">
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text className="text-base font-semibold text-slate-800 ml-1">
            {displayRating.toFixed(1)}
          </Text>
          <Text className="text-sm text-slate-400 ml-1">({reviewCount} reviews)</Text>
        </View>
      )}

      {/* Divider */}
      <View className="h-px bg-slate-100 mt-4 mb-4" />

      {/* Address */}
      {venue.address !== undefined && venue.address.length > 0 && (
        <View className="flex-row items-start mb-3">
          <Ionicons name="location-outline" size={18} color="#6D6774" style={{ marginTop: 2 }} />
          <Text className="text-base text-slate-700 ml-2 flex-1">{venue.address}</Text>
        </View>
      )}

      {/* Phone */}
      {venue.phone !== undefined && venue.phone.length > 0 && (
        <View className="flex-row items-center mb-3">
          <Ionicons name="call-outline" size={18} color="#6D6774" />
          <Text className="text-base text-slate-700 ml-2">{venue.phone}</Text>
        </View>
      )}

      {/* Website */}
      {venue.website !== undefined && venue.website.length > 0 && (
        <View className="flex-row items-center mb-3">
          <Ionicons name="globe-outline" size={18} color="#6D6774" />
          <Text className="text-base text-[#d42330] ml-2" numberOfLines={1}>
            {venue.website}
          </Text>
        </View>
      )}

      {/* Lanes — displayed as plain metadata when present */}
      {venue.lanes !== undefined && venue.lanes > 0 && (
        <View className="flex-row items-center">
          <Ionicons name="grid-outline" size={18} color="#6D6774" />
          <Text className="text-base text-slate-700 ml-2">{venue.lanes} lanes</Text>
        </View>
      )}
    </View>
  );
}
