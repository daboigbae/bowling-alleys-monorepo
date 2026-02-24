'use client';

import dynamic from 'next/dynamic';

const SportsBarPage = dynamic(() => import('@/components/pages/SportsBarPage'), {
  ssr: true,
});

export default function SportsBar({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <SportsBarPage state={state} city={city} />;
}
