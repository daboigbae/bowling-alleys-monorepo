'use client';

import dynamic from 'next/dynamic';

const TeamLogoLabPage = dynamic(() => import('@/components/pages/TeamLogoLabPage'), {
  ssr: false,
});

export default function TeamLogoLab() {
  return <TeamLogoLabPage />;
}

