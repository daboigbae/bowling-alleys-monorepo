import { View, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../../constants/theme';

const HERO_HEIGHT = 240;

interface VenueHeroHeaderProps {
  imageUri: string | null;
  isSaved: boolean;
  showSaveButton: boolean;
  isSaving: boolean;
  onToggleSave: () => void;
}

/**
 * Full-width hero image (240pt, explicit height) with overlay buttons.
 * Back button: top-left, insets.top + 12 Y offset, 44×44pt — §3.
 * Save button: top-right, same sizing — §3.
 *
 * NativeWind v4 rule: layout props outside Pressable style callback.
 * Dynamic `top` value uses a wrapping View with plain style so the Pressable
 * callback only contains opacity (state-dependent visual only).
 */
export function VenueHeroHeader({
  imageUri,
  isSaved,
  showSaveButton,
  isSaving,
  onToggleSave,
}: VenueHeroHeaderProps) {
  const insets = useSafeAreaInsets();
  // Exception: dynamic top offset from safe area insets — no NativeWind equivalent
  const buttonTop = insets.top + 12;

  return (
    <View style={{ height: HERO_HEIGHT }}>
      {/* Hero image or shimmer placeholder — explicit dimensions prevent layout shift (§9) */}
      {imageUri !== null ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: HERO_HEIGHT }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: '100%', height: HERO_HEIGHT }} className="bg-shimmer" />
      )}

      {/* Back button wrapper — positions the button absolutely with dynamic inset */}
      {/* Exception: dynamic top from insets.top — no NativeWind equivalent */}
      <View style={{ position: 'absolute', top: buttonTop, left: 16 }}>
        <Pressable
          className="w-11 h-11 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <View
            className="w-11 h-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <Ionicons name="chevron-back" size={22} color={THEME.colors.card} />
          </View>
        </Pressable>
      </View>

      {/* Save button wrapper — shown only for authenticated users */}
      {showSaveButton && (
        /* Exception: dynamic top from insets.top — no NativeWind equivalent */
        <View style={{ position: 'absolute', top: buttonTop, right: 16 }}>
          <Pressable
            className="w-11 h-11 items-center justify-center"
            style={({ pressed }) => ({
              opacity: pressed || isSaving ? 0.7 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Unsave venue' : 'Save venue'}
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={onToggleSave}
          >
            <View
              className="w-11 h-11 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={THEME.colors.card}
              />
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}
