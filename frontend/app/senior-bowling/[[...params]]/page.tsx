'use client';

import dynamic from 'next/dynamic';

const SeniorBowlingPage = dynamic(() => import('@/components/pages/SeniorBowlingPage'), {
  ssr: true,
});

export default function SeniorBowling({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <SeniorBowlingPage state={state} city={city} />;
}
