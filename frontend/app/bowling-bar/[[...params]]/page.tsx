'use client';

import dynamic from 'next/dynamic';

const BowlingBarPage = dynamic(() => import('@/components/pages/BowlingBarPage'), {
  ssr: true,
});

export default function BowlingBar({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingBarPage state={state} city={city} />;
}
