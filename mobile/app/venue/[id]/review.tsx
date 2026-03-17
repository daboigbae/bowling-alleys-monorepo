import { useLocalSearchParams } from 'expo-router';
import WriteReviewScreen from '../../../src/screens/venue/WriteReviewScreen';

export default function WriteReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WriteReviewScreen venueId={id} />;
}
