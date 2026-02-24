'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const LocationsPage = dynamic(() => import('@/components/pages/LocationsPage'), {
  ssr: true,
});

export default function Locations({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <LocationsPage state={state} city={city} />;
}

