import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  photoURL?: string | null;
  onEditPress: () => void;
}

function getInitials(displayName: string, email: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase() || (email[0]?.toUpperCase() ?? '?');
  }
  return email[0]?.toUpperCase() ?? '?';
}

/**
 * Profile header: circular avatar (photo or initials fallback), display name
 * with inline edit affordance, and email.
 * Avatar: 72×72pt, centered (§5 design notes).
 */
export function ProfileHeader({ displayName, email, photoURL, onEditPress }: ProfileHeaderProps) {
  const initials = getInitials(displayName, email);

  return (
    <View className="items-center mt-6 mb-2 px-5">
      {/* Avatar */}
      {photoURL ? (
        <Image
          source={{ uri: photoURL }}
          className="rounded-full bg-slate-100"
          // Exception: fixed pixel dimensions for avatar — required for consistent circle (§9)
          style={{ width: 72, height: 72 }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="rounded-full bg-[#d42330] items-center justify-center"
          style={{ width: 72, height: 72 }}
        >
          <Text className="text-2xl font-bold text-white">{initials}</Text>
        </View>
      )}

      {/* Display name + edit icon */}
      <Pressable
        className="flex-row items-center mt-4 px-2 py-2"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Edit display name"
        onPress={onEditPress}
      >
        <Text className="text-xl font-semibold text-slate-900 mr-1" numberOfLines={1}>
          {displayName || email}
        </Text>
        <Ionicons name="pencil-outline" size={16} color="#94A3B8" />
      </Pressable>

      {/* Email */}
      {displayName ? (
        <Text className="text-sm text-slate-400" numberOfLines={1}>
          {email}
        </Text>
      ) : null}
    </View>
  );
}
