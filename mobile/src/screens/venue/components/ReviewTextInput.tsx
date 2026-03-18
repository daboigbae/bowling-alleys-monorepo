import { View, Text, TextInput } from 'react-native';
import { THEME } from '../../../constants/theme';

const MIN_CHARS = 10;
const MAX_CHARS = 500;

interface ReviewTextInputProps {
  value: string;
  onChange: (text: string) => void;
}

/**
 * Review text body input.
 * min 10 / max 500 characters with live count shown below.
 * Character count turns red when under MIN_CHARS (to signal requirement).
 */
export function ReviewTextInput({ value, onChange }: ReviewTextInputProps) {
  const count = value.length;
  const countColor =
    count > MAX_CHARS
      ? THEME.colors.error
      : count < MIN_CHARS && count > 0
      ? THEME.colors.warning
      : THEME.colors.placeholder;

  return (
    <View>
      <TextInput
        className="border border-border rounded-xl px-4 py-3 text-base text-foreground bg-card"
        style={{ minHeight: 120, textAlignVertical: 'top' }}
        placeholder="Share your experience at this alley…"
        placeholderTextColor={THEME.colors.placeholder}
        value={value}
        onChangeText={(text) => onChange(text.slice(0, MAX_CHARS))}
        multiline
        maxLength={MAX_CHARS}
        accessibilityLabel="Review text"
        accessibilityHint={`Minimum ${MIN_CHARS} characters, maximum ${MAX_CHARS} characters`}
      />
      <Text className="text-xs mt-1 text-right" style={{ color: countColor }}>
        {count}/{MAX_CHARS}
      </Text>
    </View>
  );
}
