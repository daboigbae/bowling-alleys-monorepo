'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingLeaguesPage = dynamic(() => import('@/components/pages/BowlingLeaguesPage'), {
  ssr: true,
});

export default function BowlingLeagues({ params }: { params: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingLeaguesPage state={state} city={city} />;
}

