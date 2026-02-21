'use client';

import dynamic from 'next/dynamic';

const ExperiencesPage = dynamic(() => import('@/components/pages/ExperiencesPage'), {
  ssr: false,
});

export default function Experiences() {
  return <ExperiencesPage />;
}

