import type { Metadata } from "next";
import dynamic from "next/dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bowlingalleys.io";

export const metadata: Metadata = {
  title: "Bowling Experiences | Cosmic, Parties, Arcades & More – BowlingAlleys.io",
  description: "Explore bowling experiences beyond the lanes. Find cosmic bowling, birthday parties, arcade games, bar & grill venues, and group event packages at bowling alleys near you.",
  openGraph: {
    type: "website",
    title: "Bowling Experiences | Cosmic, Parties, Arcades & More – BowlingAlleys.io",
    description: "Explore bowling experiences beyond the lanes. Find cosmic bowling, birthday parties, arcade games, bar & grill venues, and group event packages at bowling alleys near you.",
    url: `${siteUrl}/experiences`,
    siteName: "BowlingAlleys.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bowling Experiences | Cosmic, Parties, Arcades & More – BowlingAlleys.io",
    description: "Explore bowling experiences beyond the lanes. Find cosmic bowling, birthday parties, arcade games, bar & grill venues, and group event packages at bowling alleys near you.",
  },
  alternates: { canonical: `${siteUrl}/experiences` },
};

const ExperiencesPage = dynamic(() => import("@/components/pages/ExperiencesPage"), {
  ssr: true,
});

export default function Experiences() {
  return <ExperiencesPage />;
}
