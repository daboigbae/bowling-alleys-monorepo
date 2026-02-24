'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const WheelchairAccessiblePage = dynamic(() => import('@/components/pages/WheelchairAccessiblePage'), {
  ssr: true,
});

export default function WheelchairAccessible({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <WheelchairAccessiblePage state={state} city={city} />;
}
