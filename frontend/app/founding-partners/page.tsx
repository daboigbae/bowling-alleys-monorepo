'use client';

import dynamic from 'next/dynamic';

const FoundingPartnersPage = dynamic(() => import('@/components/pages/FoundingPartnersPage'), {
  ssr: false,
});

export default function FoundingPartners() {
  return <FoundingPartnersPage />;
}

