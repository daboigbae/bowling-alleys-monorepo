import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';

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
      <Text className="text-2xl font-bold text-foreground mb-3">Explore</Text>

      <View className="flex-row items-center" style={{ gap: 12 }}>
        {/* Search placeholder — non-interactive */}
        <View className="flex-1 flex-row items-center bg-muted rounded-xl h-11 px-3">
          <Ionicons name="search-outline" size={18} color={THEME.colors.mutedForeground} />
          <Text className="ml-2 text-base text-muted-foreground">Search bowling alleys…</Text>
        </View>

        {/* Map / List toggle */}
        <View className="flex-row bg-muted rounded-xl overflow-hidden">
          <Pressable
            className={`w-11 h-11 items-center justify-center rounded-xl${viewMode === 'list' ? ' bg-primary' : ''}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="List view"
            accessibilityState={{ selected: viewMode === 'list' }}
            onPress={() => onViewModeChange('list')}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={viewMode === 'list' ? THEME.colors.card : THEME.colors.mutedForeground}
            />
          </Pressable>

          <Pressable
            className={`w-11 h-11 items-center justify-center rounded-xl${viewMode === 'map' ? ' bg-primary' : ''}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Map view"
            accessibilityState={{ selected: viewMode === 'map' }}
            onPress={() => onViewModeChange('map')}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={viewMode === 'map' ? THEME.colors.card : THEME.colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
