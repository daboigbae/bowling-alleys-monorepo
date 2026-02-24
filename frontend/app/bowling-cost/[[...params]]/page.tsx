'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingCostPage = dynamic(() => import('@/components/pages/BowlingCostPage'), {
  ssr: true,
});

export default function BowlingCost({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingCostPage state={state} city={city} />;
}
