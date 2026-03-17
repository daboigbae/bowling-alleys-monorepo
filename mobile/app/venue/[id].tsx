import { View, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Venue detail screen — placeholder until T-05.
 * Navigation target for VenueCard taps and map callout taps.
 */
export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-5"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar style="dark" />
      <Text className="text-xl font-semibold text-slate-900 mb-2">Venue Detail</Text>
      <Text className="text-base text-slate-500 mb-1">{id}</Text>
      <Text className="text-sm text-slate-400 mb-8">Coming in T-05</Text>
      <Pressable
        className="h-11 px-5 items-center justify-center rounded-xl bg-slate-100"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
      >
        <Text className="text-base font-medium text-slate-700">← Back</Text>
      </Pressable>
    </View>
  );
}
