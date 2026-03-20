import type { Metadata } from "next";
import { safeDecodeParam } from "@/lib/params";

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

  let title: string;
  let description: string;
  let canonicalPath = "/specials";

  if (stateParam && cityParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Specials in ${cityParam}, ${fullState} | Deals & Discounts`;
    description = `Find bowling deals and specials in ${cityParam}, ${fullState}. Discounted games, happy hour pricing, kids bowl free, and seasonal promotions at local bowling alleys.`;
    canonicalPath = `/specials/${stateParam}/${encodeURIComponent(cityParam)}`;
  } else if (stateParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Specials in ${fullState} | Deals & Promotions`;
    description = `Discover bowling deals across ${fullState}. Browse discounted games, happy hour specials, and promotions by city to find the best value bowling near you.`;
    canonicalPath = `/specials/${stateParam}`;
  } else {
    title = "Bowling Specials & Deals | Discounts at Bowling Alleys – BowlingAlleys.io";
    description = "Find bowling specials and deals near you. Discounted games, happy hour pricing, kids bowl free programs, and seasonal promotions at 1,800+ bowling alleys across the US.";
  }

  const currentUrl = `${siteUrl}${canonicalPath}`;

  return {
    title,
    description,
    openGraph: { type: "website", title, description, url: currentUrl, siteName: "BowlingAlleys.io" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: currentUrl },
  };
}

import SpecialsPage from "@/components/pages/SpecialsPage";

export default function Specials({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <SpecialsPage state={state} city={city} />;
}
