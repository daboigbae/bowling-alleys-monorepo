'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getCityHubBySlug } from '@/lib/cityHubsConfig';

const CityHubPage = dynamic(() => import('@/components/CityHubPage'), {
  ssr: true,
});

export default function CityHubRoute() {
  const params = useParams();
  const slug = params?.slug as string | undefined;

  if (!slug) {
    notFound();
  }

  const config = getCityHubBySlug(slug);
  if (!config) {
    notFound();
  }

  return (
    <CityHubPage
      titleTag={config.titleTag}
      metaDesc={config.metaDesc}
      h1={config.h1}
      intro={config.intro}
      city={config.city}
      state={config.state}
      year={config.year}
      stateSlug={config.stateSlug}
      slug={config.slug}
      faqs={config.faqs}
    />
  );
}
