'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const DuckpinBowlingPage = dynamic(() => import('@/components/pages/DuckpinBowlingPage'), {
  ssr: true,
});

export default function DuckpinBowling({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <DuckpinBowlingPage state={state} city={city} />;
}
