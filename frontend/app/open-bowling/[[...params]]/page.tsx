'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const OpenBowlingPage = dynamic(() => import('@/components/pages/OpenBowlingPage'), {
  ssr: true,
});

export default function OpenBowling({ params }: { params: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <OpenBowlingPage state={state} city={city} />;
}

