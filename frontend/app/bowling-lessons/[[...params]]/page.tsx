'use client';

import dynamic from 'next/dynamic';

const BowlingLessonsPage = dynamic(() => import('@/components/pages/BowlingLessonsPage'), {
  ssr: true,
});

export default function BowlingLessons({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0] ? decodeURIComponent(params.params[0]) : undefined;
  const city = params?.params?.[1] ? decodeURIComponent(params.params[1]) : undefined;
  return <BowlingLessonsPage state={state} city={city} />;
}
