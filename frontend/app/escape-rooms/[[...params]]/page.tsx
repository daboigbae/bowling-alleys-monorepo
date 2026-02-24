'use client';

import dynamic from 'next/dynamic';

const EscapeRoomsPage = dynamic(() => import('@/components/pages/EscapeRoomsPage'), {
  ssr: true,
});

export default function EscapeRooms({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <EscapeRoomsPage state={state} city={city} />;
}
