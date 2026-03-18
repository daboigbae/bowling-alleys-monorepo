import { View, Text, ActivityIndicator } from 'react-native';
import type { ReactElement } from 'react';
import { FlashList } from '@shopify/flash-list';
import { ReviewCard } from './ReviewCard';
import type { Review } from '../../../types/review';

interface ReviewsListProps {
  reviews: Review[];
  isLoading: boolean;
  isError: boolean;
  /** All venue-info content above reviews — renders as FlashList ListHeaderComponent */
  ListHeaderComponent: ReactElement;
}

/**
 * Single scrollable surface for the venue detail screen.
 * One FlashList: data = reviews, ListHeaderComponent = venue info + reviews header.
 * Avoids nested ScrollView/FlashList conflicts — §9 performance.
 * estimatedItemSize: 100 (ReviewCard approximation from spec).
 */
export function ReviewsList({
  reviews,
  isLoading,
  isError,
  ListHeaderComponent,
}: ReviewsListProps) {
  return (
    <FlashList
      data={isLoading || isError ? [] : reviews}
      keyExtractor={(item: Review) => item.id}
      estimatedItemSize={100}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={() => <View className="h-px bg-slate-100 mx-5" />}
      contentContainerStyle={{ paddingBottom: 100 }}
      renderItem={({ item }: { item: Review }) => <ReviewCard review={item} />}
      ListFooterComponent={
        isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color="#d42330" />
          </View>
        ) : isError ? (
          <View className="px-5 py-4">
            <Text className="text-base text-slate-500">Reviews unavailable.</Text>
          </View>
        ) : !isLoading && reviews.length === 0 ? (
          <View className="px-5 py-8 items-center">
            <Text className="text-base text-slate-500 text-center">
              No reviews yet. Be the first!
            </Text>
          </View>
        ) : null
      }
    />
  );
}
