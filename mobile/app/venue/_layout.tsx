import { Stack } from 'expo-router';

/** Venue route group — stack navigated from Explore tab */
export default function VenueLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
