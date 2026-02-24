'use client';

import dynamic from 'next/dynamic';

const LocationsPage = dynamic(() => import('@/components/pages/LocationsPage'), {
  ssr: true,
});

export default function Locations({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <LocationsPage state={state} city={city} />;
}

