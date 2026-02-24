'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const CandlepinBowlingPage = dynamic(() => import('@/components/pages/CandlepinBowlingPage'), {
  ssr: true,
});

export default function CandlepinBowling({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <CandlepinBowlingPage state={state} city={city} />;
}
