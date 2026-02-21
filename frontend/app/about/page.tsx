'use client';

import dynamic from 'next/dynamic';

const AboutPage = dynamic(() => import('@/components/pages/AboutPage'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  ),
});

export default function About() {
  return <AboutPage />;
}

