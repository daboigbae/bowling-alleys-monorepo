'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const SportsBarPage = dynamic(() => import('@/components/pages/SportsBarPage'), {
  ssr: true,
});

export default function SportsBar({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <SportsBarPage state={state} city={city} />;
}
