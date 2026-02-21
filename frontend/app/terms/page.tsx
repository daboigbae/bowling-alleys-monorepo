'use client';

import dynamic from 'next/dynamic';

const TermsPage = dynamic(() => import('@/components/pages/TermsPage'), {
  ssr: false,
});

export default function Terms() {
  return <TermsPage />;
}

