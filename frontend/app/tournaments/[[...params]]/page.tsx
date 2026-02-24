'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const TournamentsPage = dynamic(() => import('@/components/pages/TournamentsPage'), {
  ssr: true,
});

export default function Tournaments({ params }: { params: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <TournamentsPage state={state} city={city} />;
}

