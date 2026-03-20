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
  let canonicalPath = "/bowling-leagues";

  if (stateParam && cityParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Leagues in ${cityParam}, ${fullState} | Find League Bowling Near You`;
    description = `Join a bowling league in ${cityParam}, ${fullState}. Find recreational, competitive, and youth leagues at local bowling alleys. Check schedules, costs, and how to sign up.`;
    canonicalPath = `/bowling-leagues/${stateParam}/${encodeURIComponent(cityParam)}`;
  } else if (stateParam) {
    const fullState = abbreviationToState[stateParam.toUpperCase()] ?? stateParam;
    title = `Bowling Leagues in ${fullState} | League Bowling Locations by City`;
    description = `Find bowling leagues across ${fullState}. Browse recreational and competitive leagues by city, compare venues, and learn how to join a league near you.`;
    canonicalPath = `/bowling-leagues/${stateParam}`;
  } else {
    title = "Bowling Leagues Near Me | Find Local League Bowling – BowlingAlleys.io";
    description = "Find bowling leagues in your area. Browse recreational, competitive, and youth leagues at 1,800+ bowling alleys across the US. Compare venues, schedules, and costs.";
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

import BowlingLeaguesPage from "@/components/pages/BowlingLeaguesPage";

export default function BowlingLeagues({ params }: { params: { params?: string[] } }) {
  const state = safeDecodeParam(params?.params?.[0]);
  const city = safeDecodeParam(params?.params?.[1]);
  return <BowlingLeaguesPage state={state} city={city} />;
}
