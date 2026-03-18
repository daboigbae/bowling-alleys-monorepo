import { useState, useEffect, type ReactNode } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export interface Coords {
  lat: number;
  lng: number;
}

type GateStatus = 'checking' | 'requesting' | 'locating' | 'granted' | 'denied' | 'error';

interface LocationPermissionGateProps {
  /** Render prop — called with device coordinates once permission is granted */
  children: (coords: Coords) => ReactNode;
}

/**
 * Gates its children behind location permission.
 *
 * - Checks existing permission status on mount.
 * - If undetermined: requests foreground permission.
 * - If already denied: shows the denied state immediately (no re-prompt).
 * - Once granted: fetches current position, then renders children with coords.
 */
export function LocationPermissionGate({ children }: LocationPermissionGateProps) {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    void checkAndRequestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAndRequestPermission(): Promise<void> {
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();

      if (existing === Location.PermissionStatus.GRANTED) {
        await fetchLocation();
        return;
      }

      if (existing === Location.PermissionStatus.DENIED) {
        setStatus('denied');
        return;
      }

      // Undetermined — prompt the user
      setStatus('requesting');
      const { status: next } = await Location.requestForegroundPermissionsAsync();

      if (next === Location.PermissionStatus.GRANTED) {
        await fetchLocation();
      } else {
        setStatus('denied');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to check location permission.';
      setLocationError(message);
      setStatus('error');
    }
  }

  async function fetchLocation(): Promise<void> {
    setStatus('locating');
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setStatus('granted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get your location.';
      setLocationError(message);
      setStatus('error');
    }
  }

  // ── Granted: render children with coords ──────────────────────────────────

  if (status === 'granted' && coords !== null) {
    return <>{children(coords)}</>;
  }

  // ── Denied ────────────────────────────────────────────────────────────────

  if (status === 'denied') {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Ionicons name="location-outline" size={48} color="#94A3B8" />
        <Text className="text-xl font-semibold text-slate-900 mt-4 text-center">
          Location Access Needed
        </Text>
        <Text className="text-base text-slate-500 mt-2 mb-6 text-center">
          Enable location access in Settings to find bowling alleys near you.
        </Text>
        <Pressable
          className="bg-[#d42330] px-6 h-12 items-center justify-center rounded-xl"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          onPress={() => void Linking.openSettings()}
        >
          <Text className="text-base font-semibold text-white">Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (status === 'error') {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-xl font-semibold text-slate-900 text-center mb-2">
          Something went wrong
        </Text>
        <Text className="text-base text-slate-500 text-center mb-6">{locationError}</Text>
        <Pressable
          className="bg-[#d42330] px-6 h-12 items-center justify-center rounded-xl"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={() => {
            setStatus('checking');
            setLocationError(null);
            void checkAndRequestPermission();
          }}
        >
          <Text className="text-base font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ── Checking / requesting / locating ─────────────────────────────────────

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#d42330" />
      <Text className="text-base text-slate-500 mt-3">
        {status === 'locating' ? 'Getting your location…' : 'Requesting location access…'}
      </Text>
    </View>
  );
}
