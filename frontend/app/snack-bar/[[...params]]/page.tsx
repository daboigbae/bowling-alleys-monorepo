'use client';

import dynamic from 'next/dynamic';

const SnackBarPage = dynamic(() => import('@/components/pages/SnackBarPage'), {
  ssr: true,
});

export default function SnackBar({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <SnackBarPage state={state} city={city} />;
}
