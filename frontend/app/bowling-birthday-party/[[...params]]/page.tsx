'use client';

import dynamic from 'next/dynamic';

const BowlingBirthdayPartyPage = dynamic(() => import('@/components/pages/BowlingBirthdayPartyPage'), {
  ssr: true,
});

export default function BowlingBirthdayParty({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingBirthdayPartyPage state={state} city={city} />;
}
