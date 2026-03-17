import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, signOut } = useAuth();

  async function handleSignOut(): Promise<void> {
    try {
      await signOut();
    } catch (err: unknown) {
      console.error('Sign out failed:', err);
    }
  }

  return (
    <View
      className="flex-1 bg-white px-4"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      <View className="flex-1 items-center justify-center">
        {isLoading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : user !== null ? (
          <View className="w-full items-center">
            <Text className="text-2xl font-bold text-slate-900 mb-1">
              {user.displayName ?? user.email ?? 'Profile'}
            </Text>
            <Text className="text-base text-slate-500 mb-8">{user.email}</Text>

            <Pressable
              className="w-full items-center justify-center border border-red-200 rounded-xl h-12"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={handleSignOut}
            >
              <Text className="text-base font-medium text-red-500">Sign Out</Text>
            </Pressable>
          </View>
        ) : (
          <View className="w-full items-center">
            <Text className="text-2xl font-bold text-slate-900 mb-2">Profile</Text>
            <Text className="text-base text-slate-500 mb-8 text-center">
              Sign in to save your favorite alleys and write reviews.
            </Text>

            <Pressable
              className="w-full bg-blue-600 items-center justify-center rounded-xl h-12"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={() => router.push('/auth/login')}
            >
              <Text className="text-base font-semibold text-white">Sign In</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
