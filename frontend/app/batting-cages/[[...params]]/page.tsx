'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BattingCagesPage = dynamic(() => import('@/components/pages/BattingCagesPage'), {
  ssr: true,
});

export default function BattingCages({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BattingCagesPage state={state} city={city} />;
}
