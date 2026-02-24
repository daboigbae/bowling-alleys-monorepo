'use client';

import dynamic from 'next/dynamic';

const DuckpinBowlingPage = dynamic(() => import('@/components/pages/DuckpinBowlingPage'), {
  ssr: true,
});

export default function DuckpinBowling({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <DuckpinBowlingPage state={state} city={city} />;
}
