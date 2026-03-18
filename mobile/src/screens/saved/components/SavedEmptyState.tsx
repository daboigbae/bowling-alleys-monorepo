import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { THEME } from '../../../constants/theme';

type SavedEmptyStateVariant = 'unauthenticated' | 'empty';

interface SavedEmptyStateProps {
  variant: SavedEmptyStateVariant;
}

/**
 * Two-variant empty state for the Saved tab.
 * 'unauthenticated' — sign-in prompt with CTA button.
 * 'empty'           — authenticated but no saved alleys yet.
 */
export function SavedEmptyState({ variant }: SavedEmptyStateProps) {
  if (variant === 'unauthenticated') {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Ionicons name="bookmark-outline" size={64} color={THEME.colors.iconSubtle} />
        <Text className="text-xl font-semibold text-foreground text-center mt-6 mb-2">
          Save your favorite alleys
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-6 leading-relaxed">
          Sign in to save your favorite alleys and access them anytime.
        </Text>
        <Pressable
          className="w-full h-12 rounded-xl bg-primary items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.push('/auth/login')}
        >
          <Text className="text-base font-semibold text-primary-foreground">Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-5">
      <Ionicons name="bookmark-outline" size={64} color={THEME.colors.iconSubtle} />
      <Text className="text-xl font-semibold text-foreground text-center mt-6 mb-2">
        No saved alleys yet
      </Text>
      <Text className="text-base text-muted-foreground text-center leading-relaxed">
        Explore alleys and tap the bookmark to save them.
      </Text>
    </View>
  );
}
