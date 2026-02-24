'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const SeniorBowlingPage = dynamic(() => import('@/components/pages/SeniorBowlingPage'), {
  ssr: true,
});

export default function SeniorBowling({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <SeniorBowlingPage state={state} city={city} />;
}
