'use client';

import dynamic from 'next/dynamic';

const BowlingLeaguesPage = dynamic(() => import('@/components/pages/BowlingLeaguesPage'), {
  ssr: true,
});

export default function BowlingLeagues({ params }: { params: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingLeaguesPage state={state} city={city} />;
}

