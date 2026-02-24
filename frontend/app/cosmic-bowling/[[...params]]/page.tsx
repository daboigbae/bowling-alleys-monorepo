'use client';

import dynamic from 'next/dynamic';

const CosmicBowlingPage = dynamic(() => import('@/components/pages/CosmicBowlingPage'), {
  ssr: true,
});

export default function CosmicBowling({ params }: { params: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <CosmicBowlingPage state={state} city={city} />;
}

