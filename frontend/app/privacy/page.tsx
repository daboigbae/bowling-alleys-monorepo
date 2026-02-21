'use client';

import dynamic from 'next/dynamic';

const PrivacyPage = dynamic(() => import('@/components/pages/PrivacyPage'), {
  ssr: false,
});

export default function Privacy() {
  return <PrivacyPage />;
}

