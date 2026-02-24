'use client';

import dynamic from 'next/dynamic';

const BowlingCostPage = dynamic(() => import('@/components/pages/BowlingCostPage'), {
  ssr: true,
});

export default function BowlingCost({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingCostPage state={state} city={city} />;
}
