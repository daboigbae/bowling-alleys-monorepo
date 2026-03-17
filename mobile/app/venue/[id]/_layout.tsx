import { Stack } from 'expo-router';

/**
 * Nested layout for /venue/[id]/.
 * index → venue detail (no header, full-screen)
 * review → write review (presented as modal)
 */
export default function VenueIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="review" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
