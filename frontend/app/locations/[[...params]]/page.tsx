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
  let title = "Find Bowling Alleys by Location | All 50 States – BowlingAlleys.io";
  let description =
    "Browse 1,800+ bowling alleys across every U.S. state. Compare prices, hours, reviews, and amenities to plan your next bowling night.";
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

  return (
    <>
      <h1 className="text-3xl font-bold text-[#0d3149] px-4 pt-8 pb-2 max-w-7xl mx-auto">{h1}</h1>
      <LocationsPage state={stateParam} city={cityParam} />
    </>
  );
}
