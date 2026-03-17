import '../global.css';

import { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { QueryProvider } from '../src/providers/QueryProvider';
import { FirebaseProvider } from '../src/providers/FirebaseProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CsGordon: require('../assets/fonts/CsGordon.otf'),
    'Montserrat-Regular': Montserrat_400Regular,
    'Montserrat-Medium': Montserrat_500Medium,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
    'PublicSans-Regular': PublicSans_400Regular,
    'PublicSans-Medium': PublicSans_500Medium,
    'PublicSans-SemiBold': PublicSans_600SemiBold,
    'PublicSans-Bold': PublicSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError !== null) {
      if (fontError !== null) {
        console.error('Font loading failed:', fontError);
      }
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && fontError === null) {
    return null;
  }

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
