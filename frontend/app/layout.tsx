import type { Metadata } from "next";
import { Montserrat, Public_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { getFooterVenues } from "@/lib/venue-server";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-subtitle",
  display: "swap",
});

const csGordon = localFont({
  src: "../public/attached_assets/CsGordon-YzRaL_1767047207927.otf",
  variable: "--font-title",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Find Bowling Alleys: Reviews & Locations - BowlingAlleys.io",
  description: "Discover the best bowling alleys near you. Read reviews, compare prices, and find cosmic bowling, leagues, birthday parties, and more.",
  keywords: "bowling alleys, bowling reviews, find bowling alleys, local bowling centers, bowling ratings",
  openGraph: {
    title: "Find Bowling Alleys: Reviews & Locations - BowlingAlleys.io",
    description: "Discover the best bowling alleys near you. Read reviews, compare prices, and find cosmic bowling, leagues, birthday parties, and more.",
    url: "https://bowlingalleys.io",
    siteName: "BowlingAlleys.io",
    images: [
      {
        url: "https://bowlingalleys.io/attached_assets/find-your-lane.png",
        width: 1024,
        height: 537,
        alt: "BowlingAlleys.io cat mascot with the slogan Find Your Lane",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Bowling Alleys: Reviews & Locations - BowlingAlleys.io",
    description: "Discover the best bowling alleys near you. Read reviews, compare prices, and find cosmic bowling, leagues, birthday parties, and more.",
    images: ["https://bowlingalleys.io/attached_assets/find-your-lane.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const footerVenues = await getFooterVenues();
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className={`${montserrat.variable} ${publicSans.variable} ${csGordon.variable} bg-white`}>
        <Providers initialTopAlleys={footerVenues.topAlleys}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

