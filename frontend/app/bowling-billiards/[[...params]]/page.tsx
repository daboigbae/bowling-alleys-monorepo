'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingBilliardsPage = dynamic(() => import('@/components/pages/BowlingBilliardsPage'), {
  ssr: true,
});

export default function BowlingBilliards({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingBilliardsPage state={state} city={city} />;
}
