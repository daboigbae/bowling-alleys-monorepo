import { useLocalSearchParams } from 'expo-router';
import VenueDetailScreen from '../../../src/screens/venue/VenueDetailScreen';

export default function VenueDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VenueDetailScreen venueId={id} />;
}
