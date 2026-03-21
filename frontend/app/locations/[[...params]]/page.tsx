import type { Metadata } from "next";

import { safeDecodeParam } from "@/lib/params";

// Static mapping — no API call needed for metadata
const abbreviationToState: Record<string, string> = {
  AK: "Alaska", AL: "Alabama", AR: "Arkansas", AZ: "Arizona",
  CA: "California", CO: "Colorado", CT: "Connecticut",
  DC: "Washington D.C.", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", IA: "Iowa", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts",
  MD: "Maryland", ME: "Maine", MI: "Michigan", MN: "Minnesota",
  MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NV: "Nevada", NY: "New York", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VA: "Virginia", VT: "Vermont", WA: "Washington",
  WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bowlingalleys.io";

export function generateMetadata({
  params,
}: {
  params?: { params?: string[] };
}): Metadata {
  const stateParam = safeDecodeParam(params?.params?.[0]);
  const cityParam = safeDecodeParam(params?.params?.[1]);

  // Default — /locations index
  let title = "Bowling Alleys Near You | Search by City or State – BowlingAlleys.io";
  let description =
    "Find bowling alleys near you. Search by city or state — compare prices, hours, reviews, and amenities across 1,800+ locations nationwide.";
  let canonicalPath = "/locations";

  if (stateParam && cityParam) {
    // City + State page — e.g. /locations/TX/Dallas
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    const city = cityParam;
    title = `Bowling Alleys in ${city}, ${fullState} | Prices, Hours & Reviews – BowlingAlleys.io`;
    description = `Find the best bowling alleys in ${city}, ${fullState}. Compare prices, hours, leagues, cosmic bowling, and real reviews. Plan your bowling night with BowlingAlleys.io.`;
    canonicalPath = `/locations/${stateParam}/${encodeURIComponent(city)}`;
  } else if (stateParam) {
    // State page — e.g. /locations/TX
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Alleys in ${fullState} | Prices, Hours & Reviews – BowlingAlleys.io`;
    description = `Explore bowling alleys across ${fullState}. Find locations by city, compare prices, check hours, and read reviews. Your guide to bowling in ${fullState}.`;
    canonicalPath = `/locations/${stateParam}`;
  }

  const currentUrl = `${siteUrl}${canonicalPath}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: currentUrl,
      siteName: "BowlingAlleys.io",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: currentUrl,
    },
  };
}

import dynamic from "next/dynamic";
const LocationsPage = dynamic(() => import("@/components/pages/LocationsPage"), { ssr: false });

function buildLocationSchema(stateParam?: string, cityParam?: string) {
  if (cityParam && stateParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    const url = `${siteUrl}/locations/${stateParam}/${encodeURIComponent(cityParam)}`;
    return {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: `Bowling Alleys in ${cityParam}, ${fullState}`,
      description: `Find and compare bowling alleys in ${cityParam}, ${fullState}. Check prices, hours, and reviews.`,
      url,
      about: {
        "@type": "City",
        name: cityParam,
        containedInPlace: { "@type": "State", name: fullState },
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Locations", item: `${siteUrl}/locations` },
          { "@type": "ListItem", position: 3, name: fullState, item: `${siteUrl}/locations/${stateParam}` },
          { "@type": "ListItem", position: 4, name: cityParam, item: url },
        ],
      },
    };
  }

  if (stateParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    const url = `${siteUrl}/locations/${stateParam}`;
    return {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: `Bowling Alleys in ${fullState}`,
      description: `Browse bowling alleys across ${fullState}. Find locations by city, compare prices, check hours, and read reviews.`,
      url,
      about: { "@type": "State", name: fullState },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Locations", item: `${siteUrl}/locations` },
          { "@type": "ListItem", position: 3, name: fullState, item: url },
        ],
      },
    };
  }

  // Root /locations page
  return {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: "Find Bowling Alleys by City or State",
    description: "Browse 1,800+ bowling alleys across all 50 U.S. states. Search by city or state.",
    url: `${siteUrl}/locations`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Locations", item: `${siteUrl}/locations` },
      ],
    },
  };
}

export default function Locations({ params }: { params?: { params?: string[] } }) {
  const stateParam = safeDecodeParam(params?.params?.[0]);
  const cityParam = safeDecodeParam(params?.params?.[1]);

  let h1 = "Find Bowling Alleys by Location | All 50 States";
  if (stateParam && cityParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    h1 = "Bowling Alleys in {city}, {fullState}".replace('{city}', cityParam).replace('{fullState}', fullState);
  } else if (stateParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    h1 = "Bowling Alleys in {fullState}".replace('{fullState}', fullState);
  }

  const schema = buildLocationSchema(stateParam, cityParam);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="hidden">{h1}</h1>
      <LocationsPage state={stateParam} city={cityParam} />
    </>
  );
}
