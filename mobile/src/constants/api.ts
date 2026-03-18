import { Platform } from 'react-native';

const rawUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

// Android emulator routes `localhost` to itself, not the host machine.
// `10.0.2.2` is the standard alias for the host's localhost inside the Android emulator.
// Physical Android devices need the host's LAN IP set directly in EXPO_PUBLIC_API_BASE_URL.
const API_BASE_URL =
  Platform.OS === 'android'
    ? rawUrl.replace('localhost', '10.0.2.2')
    : rawUrl;

export const API = {
  baseUrl: API_BASE_URL,
} as const;
