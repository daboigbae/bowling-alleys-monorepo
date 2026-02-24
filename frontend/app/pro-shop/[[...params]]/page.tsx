'use client';

import dynamic from 'next/dynamic';

const ProShopPage = dynamic(() => import('@/components/pages/ProShopPage'), {
  ssr: true,
});

export default function ProShop({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <ProShopPage state={state} city={city} />;
}
