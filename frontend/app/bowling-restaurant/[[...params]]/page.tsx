'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingRestaurantPage = dynamic(() => import('@/components/pages/BowlingRestaurantPage'), {
  ssr: true,
});

export default function BowlingRestaurant({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingRestaurantPage state={state} city={city} />;
}
