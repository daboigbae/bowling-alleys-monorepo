import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '../src/providers/QueryProvider';
import { FirebaseProvider } from '../src/providers/FirebaseProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <FirebaseProvider>
          <QueryProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </QueryProvider>
        </FirebaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
