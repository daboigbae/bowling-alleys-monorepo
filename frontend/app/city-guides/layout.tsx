import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "City Guides | Best Bowling by City - BowlingAlleys.io",
  description:
    "Explore comprehensive bowling guides for cities across the US. Find the best alleys, pricing, cosmic bowling, and leagues in your area.",
};

export default function CityGuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
