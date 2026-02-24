'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const KaraokeBowlingPage = dynamic(() => import('@/components/pages/KaraokeBowlingPage'), {
  ssr: true,
});

export default function KaraokeBowling({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <KaraokeBowlingPage state={state} city={city} />;
}
