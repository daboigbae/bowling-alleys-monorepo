'use client';

import dynamic from 'next/dynamic';

const LaserTagPage = dynamic(() => import('@/components/pages/LaserTagPage'), {
  ssr: true,
});

export default function LaserTag({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <LaserTagPage state={state} city={city} />;
}
