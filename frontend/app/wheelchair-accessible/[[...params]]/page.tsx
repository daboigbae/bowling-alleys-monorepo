'use client';

import dynamic from 'next/dynamic';

const WheelchairAccessiblePage = dynamic(() => import('@/components/pages/WheelchairAccessiblePage'), {
  ssr: true,
});

export default function WheelchairAccessible({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <WheelchairAccessiblePage state={state} city={city} />;
}
