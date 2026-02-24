'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const ProShopPage = dynamic(() => import('@/components/pages/ProShopPage'), {
  ssr: true,
});

export default function ProShop({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <ProShopPage state={state} city={city} />;
}
