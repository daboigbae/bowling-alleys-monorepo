'use client';

import dynamic from 'next/dynamic';

const CityGuidesPage = dynamic(() => import('@/components/pages/CityGuidesPage'), {
  ssr: true,
});

export default function CityGuides() {
  return <CityGuidesPage />;
}
