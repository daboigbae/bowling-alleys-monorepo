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
  let canonicalPath = "/bowling-cost";

  if (stateParam && cityParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Costs in ${cityParam}, ${fullState} | Average Bowling Prices & Shoe Rental`;
    description = `How much does bowling cost in ${cityParam}, ${fullState}? Compare game prices, shoe rental fees, and hourly rates at local bowling alleys. Find the best value near you.`;
    canonicalPath = `/bowling-cost/${stateParam}/${encodeURIComponent(cityParam)}`;
  } else if (stateParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Costs in ${fullState} | Bowling Alley Prices by City`;
    description = `Compare bowling prices across ${fullState}. Find average game costs, shoe rental fees, and hourly rates at bowling alleys in every city.`;
    canonicalPath = `/bowling-cost/${stateParam}`;
  } else {
    title = "How Much Does Bowling Cost? | Prices & Fees – BowlingAlleys.io";
    description = "How much does bowling cost? Compare game prices, shoe rental fees, and hourly rates at 1,800+ bowling alleys across the US. Find affordable bowling near you.";
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

import BowlingCostPage from "@/components/pages/BowlingCostPage";

export default function BowlingCost({ params }: { params?: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingCostPage state={state} city={city} />;
}
