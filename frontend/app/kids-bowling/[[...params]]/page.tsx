'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const KidsBowlingPage = dynamic(() => import('@/components/pages/KidsBowlingPage'), {
  ssr: true,
});

export default function KidsBowling({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <KidsBowlingPage state={state} city={city} />;
}
