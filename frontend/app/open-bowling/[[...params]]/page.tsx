'use client';

import dynamic from 'next/dynamic';

const OpenBowlingPage = dynamic(() => import('@/components/pages/OpenBowlingPage'), {
  ssr: true,
});

export default function OpenBowling({ params }: { params: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <OpenBowlingPage state={state} city={city} />;
}

