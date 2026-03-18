import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EditDisplayNameSheetProps {
  visible: boolean;
  currentName: string;
  isSaving: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

const SHEET_HEIGHT = 280;

/**
 * Slide-up bottom sheet for editing display name.
 * Implemented with react-native Modal + Animated slide-up (no external library).
 * KeyboardAvoidingView prevents the input being obscured on keyboard open (§5).
 * Handle indicator: 4pt × 32pt, rounded-full, 8pt from top (Design Standard §5).
 */
export function EditDisplayNameSheet({
  visible,
  currentName,
  isSaving,
  onSave,
  onClose,
}: EditDisplayNameSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentName);
  // Exception: slide animation value — computed from JS thread, no NativeWind equivalent
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Sync input when sheet opens with a potentially updated currentName
  useEffect(() => {
    if (visible) {
      setName(currentName);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, currentName, slideAnim]);

  const canSave = name.trim().length > 0 && name.trim() !== currentName && !isSaving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/40"
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Exception: bottom offset from safe area — dynamic, no NativeWind equivalent
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <Animated.View
          className="bg-white rounded-t-2xl"
          style={{ transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 }}
        >
          {/* Handle indicator — §5: 4pt tall, 32pt wide, rounded-full, 8pt from top */}
          <View className="items-center pt-2 pb-4">
            <View className="bg-slate-200 rounded-full" style={{ width: 32, height: 4 }} />
          </View>

          <View className="px-5">
            <Text className="text-lg font-semibold text-slate-900 mb-4">Edit Display Name</Text>

            <TextInput
              className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-900 bg-white mb-4"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#94A3B8"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { if (canSave) onSave(name.trim()); }}
              accessibilityLabel="Display name"
            />

            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 h-12 rounded-xl border border-slate-200 items-center justify-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={onClose}
              >
                <Text className="text-base font-medium text-slate-600">Cancel</Text>
              </Pressable>

              <Pressable
                className="flex-1 h-12 rounded-xl bg-[#d42330] items-center justify-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : (canSave ? 1 : 0.4) })}
                accessibilityRole="button"
                accessibilityLabel="Save display name"
                accessibilityState={{ disabled: !canSave }}
                disabled={!canSave}
                onPress={() => { if (canSave) onSave(name.trim()); }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
