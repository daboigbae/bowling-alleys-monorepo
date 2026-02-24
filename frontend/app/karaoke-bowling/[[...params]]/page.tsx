'use client';

import dynamic from 'next/dynamic';

const KaraokeBowlingPage = dynamic(() => import('@/components/pages/KaraokeBowlingPage'), {
  ssr: true,
});

export default function KaraokeBowling({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <KaraokeBowlingPage state={state} city={city} />;
}
