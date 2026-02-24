'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const ArcadeBowlingPage = dynamic(() => import('@/components/pages/ArcadeBowlingPage'), {
  ssr: true,
});

export default function ArcadeBowling({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <ArcadeBowlingPage state={state} city={city} />;
}
