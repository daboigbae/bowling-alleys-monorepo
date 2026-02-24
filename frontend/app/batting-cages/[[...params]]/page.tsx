'use client';

import dynamic from 'next/dynamic';

const BattingCagesPage = dynamic(() => import('@/components/pages/BattingCagesPage'), {
  ssr: true,
});

export default function BattingCages({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BattingCagesPage state={state} city={city} />;
}
