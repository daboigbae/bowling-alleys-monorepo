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

function buildLocalBusinessSchema(venue: any, venueId: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bowlingalleys.io';

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: venue.name,
    url: `${siteUrl}/venue/${venueId}`,
  };

  // Address
  if (venue.address || venue.city || venue.state) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(venue.address && { streetAddress: venue.address }),
      ...(venue.city && { addressLocality: venue.city }),
      ...(venue.state && { addressRegion: venue.state }),
      ...(venue.zipCode && { postalCode: venue.zipCode }),
      addressCountry: 'US',
    };
  }

  // Phone
  if (venue.phone) schema.telephone = venue.phone;

  // Website
  if (venue.website) schema.sameAs = venue.website;

  // Image
  const images = venue.imageUrls?.length ? venue.imageUrls : venue.coverImageUrl ? [venue.coverImageUrl] : null;
  if (images) schema.image = images.slice(0, 3);

  // Rating
  if (venue.avgRating > 0 && venue.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: venue.avgRating.toFixed(1),
      reviewCount: venue.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  } else if (venue.googleRating > 0 && venue.googleUserRatingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: venue.googleRating.toFixed(1),
      reviewCount: venue.googleUserRatingCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Opening hours from weekdayText (simplest approach)
  if (venue.weekdayText?.length) {
    schema.openingHours = venue.weekdayText;
  }

  // Price range
  if (venue.pricing?.game > 0) {
    schema.priceRange = `$${venue.pricing.game}–$${(venue.pricing.game * 3).toFixed(0)} per person`;
  } else if (venue.pricing?.hourly > 0) {
    schema.priceRange = `$${venue.pricing.hourly} per lane/hour`;
  }

  return schema;
}

export default async function VenueDetail({ params }: { params: { id: string } }) {
  const venueData = await getVenueForMetadata(params.id);
  const schema = venueData ? buildLocalBusinessSchema(venueData, params.id) : null;

  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <VenueDetailPage venueId={params.id} initialVenueData={venueData} />
    </>
  );
}

