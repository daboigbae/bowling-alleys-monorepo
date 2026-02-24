'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const CorporateEventsPage = dynamic(() => import('@/components/pages/CorporateEventsPage'), {
  ssr: true,
});

export default function CorporateEvents({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <CorporateEventsPage state={state} city={city} />;
}
