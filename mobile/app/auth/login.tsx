import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { firebaseApp } from '../../src/lib/firebase';
import { sendCode, verifyCode } from '../../src/lib/api';
import { THEME } from '../../src/constants/theme';

type Step = 'email' | 'code';

// Border color values reference THEME tokens — inline style required because
// borderColor is dynamic (switches between error and default states).
const BORDER_DEFAULT = THEME.colors.border;
const BORDER_ERROR = THEME.colors.error;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      await sendCode(email.trim());
      setStep('code');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to connect. Check your connection.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const { customToken } = await verifyCode(email.trim(), code.trim());
      const auth = getAuth(firebaseApp);
      await signInWithCustomToken(auth, customToken);
      router.back();
    } catch (err: unknown) {
      let message =
        err instanceof Error ? err.message : 'Verification failed. Try again.';
      if (message.toLowerCase().includes('expired')) {
        message = 'Code expired. Request a new one.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const emailSendDisabled = isLoading || email.trim().length === 0;
  const codeVerifyDisabled = isLoading || code.trim().length < 6;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-card"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <View
        className="flex-1 px-5"
        // Exception: dynamic safe area insets — no NativeWind equivalent
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          className="mb-8 self-start p-2"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Cancel sign in"
          onPress={() => router.back()}
        >
          <Text className="text-base text-primary">Cancel</Text>
        </Pressable>

        {step === 'email' ? (
          <View>
            {/* BAIO logo mark — 80×80pt, centered, §3: non-interactive so no touch target required */}
            <Image
              source={require('../../assets/images/icon.png')}
              // Exception: fixed pixel dimensions for logo image — required for consistent sizing
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
              className="self-center mb-6"
            />
            <Text className="text-2xl font-bold text-foreground mb-2">Sign In</Text>
            <Text className="text-base text-muted-foreground mb-8">
              Enter your email to receive a sign-in code.
            </Text>

            <TextInput
              className="h-12 border rounded-xl px-4 text-base text-foreground"
              style={{ borderColor: error !== null ? BORDER_ERROR : BORDER_DEFAULT }}
              placeholder="your@email.com"
              placeholderTextColor={THEME.colors.mutedForeground}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleSendCode}
            />

            {error !== null && (
              <Text className="text-sm text-red-500 mt-2">{error}</Text>
            )}

            <Pressable
              className="bg-primary items-center justify-center rounded-xl mt-6 h-12"
              style={({ pressed }) => ({
                opacity: pressed || emailSendDisabled ? 0.6 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Send sign-in code"
              accessibilityState={{ disabled: emailSendDisabled }}
              disabled={emailSendDisabled}
              onPress={handleSendCode}
            >
              {isLoading ? (
                <ActivityIndicator color={THEME.colors.card} />
              ) : (
                <Text className="text-base font-semibold text-primary-foreground">Send Code</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-2xl font-bold text-foreground mb-2">Check your email</Text>
            <Text className="text-base text-muted-foreground mb-8">
              Enter the 6-digit code sent to {email}
            </Text>

            <TextInput
              className="h-14 border rounded-xl px-4 text-2xl font-bold text-center tracking-[8px] text-foreground"
              style={{ borderColor: error !== null ? BORDER_ERROR : BORDER_DEFAULT }}
              placeholder="000000"
              placeholderTextColor={THEME.colors.mutedForeground}
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyCode}
            />

            {error !== null && (
              <View className="flex-row items-center mt-2">
                <Text className="text-sm text-red-500 flex-1">{error}</Text>
                {error.toLowerCase().includes('expired') && (
                  <Pressable
                    className="ml-2 p-1"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    accessibilityRole="button"
                    accessibilityLabel="Resend code"
                    onPress={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                    }}
                  >
                    <Text className="text-sm font-medium text-primary">Resend</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable
              className="bg-primary items-center justify-center rounded-xl mt-6 h-12"
              style={({ pressed }) => ({
                opacity: pressed || codeVerifyDisabled ? 0.6 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Verify code"
              accessibilityState={{ disabled: codeVerifyDisabled }}
              disabled={codeVerifyDisabled}
              onPress={handleVerifyCode}
            >
              {isLoading ? (
                <ActivityIndicator color={THEME.colors.card} />
              ) : (
                <Text className="text-base font-semibold text-primary-foreground">Verify</Text>
              )}
            </Pressable>

            <Pressable
              className="items-center justify-center mt-4 p-2"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityRole="button"
              accessibilityLabel="Go back to email entry"
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              <Text className="text-sm text-primary">← Back to email</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
