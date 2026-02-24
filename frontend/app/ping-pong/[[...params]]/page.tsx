'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingPingPongPage = dynamic(() => import('@/components/pages/BowlingPingPongPage'), {
  ssr: true,
});

export default function BowlingPingPong({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingPingPongPage state={state} city={city} />;
}
