'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const CosmicBowlingPage = dynamic(() => import('@/components/pages/CosmicBowlingPage'), {
  ssr: true,
});

export default function CosmicBowling({ params }: { params: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <CosmicBowlingPage state={state} city={city} />;
}

