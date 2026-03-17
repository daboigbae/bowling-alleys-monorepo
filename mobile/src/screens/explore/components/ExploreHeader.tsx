import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ViewMode = 'list' | 'map';

interface ExploreHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Explore screen header.
 * - Search bar: visual placeholder only (search is out of scope for T-04).
 * - Map/List toggle: 44pt touch targets, segmented-control style.
 */
export function ExploreHeader({ viewMode, onViewModeChange }: ExploreHeaderProps) {
  return (
    <View className="px-5 pb-3">
      <Text className="text-2xl font-bold text-slate-900 mb-3">Explore</Text>

      <View className="flex-row items-center" style={{ gap: 12 }}>
        {/* Search placeholder — non-interactive */}
        <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl h-11 px-3">
          <Ionicons name="search-outline" size={18} color="#6D6774" />
          <Text className="ml-2 text-base text-slate-400">Search bowling alleys…</Text>
        </View>

        {/* Map / List toggle */}
        <View className="flex-row bg-slate-100 rounded-xl overflow-hidden">
          <Pressable
            className="w-11 h-11 items-center justify-center"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: viewMode === 'list' ? '#2563EB' : 'transparent',
              borderRadius: 12,
            })}
            accessibilityRole="button"
            accessibilityLabel="List view"
            accessibilityState={{ selected: viewMode === 'list' }}
            onPress={() => onViewModeChange('list')}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={viewMode === 'list' ? '#FFFFFF' : '#6D6774'}
            />
          </Pressable>

          <Pressable
            className="w-11 h-11 items-center justify-center"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: viewMode === 'map' ? '#2563EB' : 'transparent',
              borderRadius: 12,
            })}
            accessibilityRole="button"
            accessibilityLabel="Map view"
            accessibilityState={{ selected: viewMode === 'map' }}
            onPress={() => onViewModeChange('map')}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={viewMode === 'map' ? '#FFFFFF' : '#6D6774'}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
