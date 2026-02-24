'use client';

import dynamic from 'next/dynamic';

const ArcadeBowlingPage = dynamic(() => import('@/components/pages/ArcadeBowlingPage'), {
  ssr: true,
});

export default function ArcadeBowling({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <ArcadeBowlingPage state={state} city={city} />;
}
