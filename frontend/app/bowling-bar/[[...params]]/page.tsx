'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingBarPage = dynamic(() => import('@/components/pages/BowlingBarPage'), {
  ssr: true,
});

export default function BowlingBar({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingBarPage state={state} city={city} />;
}
