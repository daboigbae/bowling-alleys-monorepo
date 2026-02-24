'use client';

import dynamic from 'next/dynamic';

const BowlingBilliardsPage = dynamic(() => import('@/components/pages/BowlingBilliardsPage'), {
  ssr: true,
});

export default function BowlingBilliards({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingBilliardsPage state={state} city={city} />;
}
