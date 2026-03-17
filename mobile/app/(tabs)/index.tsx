import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white px-4"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-slate-900">Explore</Text>
        <Text className="mt-2 text-base text-slate-500">
          Find bowling alleys near you
        </Text>
      </View>
    </View>
  );
}
