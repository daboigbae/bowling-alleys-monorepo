'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const LaserTagPage = dynamic(() => import('@/components/pages/LaserTagPage'), {
  ssr: true,
});

export default function LaserTag({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <LaserTagPage state={state} city={city} />;
}
