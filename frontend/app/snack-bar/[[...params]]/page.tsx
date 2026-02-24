'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const SnackBarPage = dynamic(() => import('@/components/pages/SnackBarPage'), {
  ssr: true,
});

export default function SnackBar({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <SnackBarPage state={state} city={city} />;
}
