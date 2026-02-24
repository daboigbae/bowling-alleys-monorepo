'use client';

import dynamic from 'next/dynamic';

const KidsBowlingPage = dynamic(() => import('@/components/pages/KidsBowlingPage'), {
  ssr: true,
});

export default function KidsBowling({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <KidsBowlingPage state={state} city={city} />;
}
