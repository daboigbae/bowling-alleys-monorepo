'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const EscapeRoomsPage = dynamic(() => import('@/components/pages/EscapeRoomsPage'), {
  ssr: true,
});

export default function EscapeRooms({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <EscapeRoomsPage state={state} city={city} />;
}
