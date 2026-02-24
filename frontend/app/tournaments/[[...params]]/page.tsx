'use client';

import dynamic from 'next/dynamic';

const TournamentsPage = dynamic(() => import('@/components/pages/TournamentsPage'), {
  ssr: true,
});

export default function Tournaments({ params }: { params: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <TournamentsPage state={state} city={city} />;
}

