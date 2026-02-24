'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingBirthdayPartyPage = dynamic(() => import('@/components/pages/BowlingBirthdayPartyPage'), {
  ssr: true,
});

export default function BowlingBirthdayParty({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingBirthdayPartyPage state={state} city={city} />;
}
