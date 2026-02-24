'use client';

import dynamic from 'next/dynamic';
import { safeDecodeParam } from '@/lib/params';

const BowlingLessonsPage = dynamic(() => import('@/components/pages/BowlingLessonsPage'), {
  ssr: true,
});

export default function BowlingLessons({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingLessonsPage state={state} city={city} />;
}
