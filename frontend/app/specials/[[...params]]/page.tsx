'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const SpecialsPage = dynamic(() => import('@/components/pages/SpecialsPage'), {
  ssr: true,
});

export default function Specials({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <SpecialsPage state={state} city={city} />;
}
