'use client';

import dynamic from 'next/dynamic';

const CandlepinBowlingPage = dynamic(() => import('@/components/pages/CandlepinBowlingPage'), {
  ssr: true,
});

export default function CandlepinBowling({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <CandlepinBowlingPage state={state} city={city} />;
}
