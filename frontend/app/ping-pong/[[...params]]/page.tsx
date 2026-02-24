'use client';

import dynamic from 'next/dynamic';

const BowlingPingPongPage = dynamic(() => import('@/components/pages/BowlingPingPongPage'), {
  ssr: true,
});

export default function BowlingPingPong({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingPingPongPage state={state} city={city} />;
}
