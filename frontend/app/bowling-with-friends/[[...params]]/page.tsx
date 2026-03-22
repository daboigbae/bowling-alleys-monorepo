'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingWithFriendsPage = dynamic(() => import('@/components/pages/BowlingWithFriendsPage'), {
  ssr: true,
});

export default function BowlingWithFriends({ params }: { params: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingWithFriendsPage state={state} city={city} />;
}
