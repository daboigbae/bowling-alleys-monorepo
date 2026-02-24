import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getVenueForMetadata } from '@/lib/venue-server';

const VenueDetailPage = dynamic(() => import('@/components/pages/VenueDetailPage'), {
  ssr: true,
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const venue = await getVenueForMetadata(params.id);
  
  if (!venue) {
    return {
      title: 'Bowling Alley Not Found | BowlingAlleys.io',
      description: 'The bowling alley you are looking for could not be found.',
    };
  }

  const loc = [venue.city, venue.state].filter(Boolean).join(", ");
  const year = new Date().getFullYear();
  
  // Generate title
  let pageTitle: string;
  if ((venue as any).seoTitle) {
    pageTitle = (venue as any).seoTitle;
  } else {
    const baseTitle = loc
      ? `${venue.name} – ${loc} Reviews & Prices (${year})`
      : `${venue.name} Reviews & Prices (${year}) | BowlingAlleys.io`;
    pageTitle =
      baseTitle.length > 60
        ? `${venue.name} – ${loc} Bowling (${year})`
        : baseTitle;
  }

  // Generate description
  const ratingBits = venue.avgRating > 0 ? `${venue.avgRating.toFixed(1)}★ · ` : "";
  const reviewBits = venue.reviewCount > 0
    ? ` • ${venue.reviewCount} review${venue.reviewCount === 1 ? "" : "s"}`
    : "";
  let desc = `${ratingBits}${venue.name}${loc ? ` in ${loc}` : ""}: prices, hours, shoe rental, leagues, cosmic & directions. Plan with BowlingAlleys.io${reviewBits}.`;
  if (desc.length > 155) {
    desc = desc.slice(0, 152).replace(/\s+\S*$/, "") + "…";
  }

  // Get OG image
  const imageUrls = (venue as any).imageUrls;
  let ogImage = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bowlingalleys.io'}/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg`;
  if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
    ogImage = imageUrls[0];
  } else if ((venue as any).coverImageUrl) {
    ogImage = (venue as any).coverImageUrl;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bowlingalleys.io';
  const currentUrl = `${siteUrl}/venue/${params.id}`;

  return {
    title: pageTitle,
    description: desc,
    openGraph: {
      type: 'website',
      title: pageTitle,
      description: desc,
      url: currentUrl,
      siteName: 'BowlingAlleys.io',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 800,
          alt: `${venue.name} bowling alley`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: desc,
      images: [ogImage],
    },
    alternates: {
      canonical: currentUrl,
    },
  };
}

export default async function VenueDetail({ params }: { params: { id: string } }) {
  const venueData = await getVenueForMetadata(params.id);
  return <VenueDetailPage venueId={params.id} initialVenueData={venueData} />;
}

