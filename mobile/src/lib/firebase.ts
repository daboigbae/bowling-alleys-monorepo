import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAuth, type Auth, type Persistence } from 'firebase/auth';
// getReactNativePersistence lives in the Metro-resolved RN bundle (dist/rn/index.js via
// the "react-native" field in @firebase/auth/package.json). TypeScript's exports map
// doesn't expose it, so we reach it via require. It is present at runtime on device.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};
import AsyncStorage from '@react-native-async-storage/async-storage';

const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

function validateEnvVars(): void {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 1) {
    throw new Error(
      `Missing required Firebase environment variables:\n${missing.join('\n')}\n\nCopy .env.example to .env and fill in all values.`
    );
  }
}

function createFirebaseApp(): { app: FirebaseApp; auth: Auth } {
  validateEnvVars();

  const app = initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  });

  // initializeAuth (not getAuth) is required to set persistence on React Native.
  // getAuth() falls back to in-memory persistence — session lost on every restart.
  const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  return { app, auth };
}

const { app: firebaseApp, auth: firebaseAuth } = createFirebaseApp();

export { firebaseApp, firebaseAuth };
