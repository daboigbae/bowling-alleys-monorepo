'use client';

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getTopAlleys, getSponsorVenues } from "@/lib/firestore";
import Image from "next/image";
import { SiFacebook, SiReddit, SiCrunchbase } from "react-icons/si";
import { Crown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SuggestLocationBanner from "@/components/SuggestLocationBanner";
import type { FooterVenue } from "@/lib/footer-venues-types";

interface FooterProps {
  initialTopAlleys?: FooterVenue[];
  initialSponsorVenues?: FooterVenue[];
}

export default function Footer({ initialTopAlleys, initialSponsorVenues }: FooterProps) {
  const { data: topAlleys } = useQuery({
    queryKey: ["/top-alleys"],
    queryFn: getTopAlleys,
    initialData: initialTopAlleys,
  });

  const { data: sponsorVenues } = useQuery({
    queryKey: ["/sponsor-venues"],
    queryFn: getSponsorVenues,
    initialData: initialSponsorVenues,
  });

  return (
    <div className="bg-white">
      {/* Upper Footer Section - White Background */}
      <div className="py-16 mt-8" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Suggest Location Banner */}
          <div className="mb-8">
            <SuggestLocationBanner />
          </div>
          {/* Sponsors Section */}
          {sponsorVenues && sponsorVenues.length > 0 && (
            <div className="mb-16">
              <h3
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{ color: "#0d3149" }}
              >
                <DollarSign className="h-5 w-5" style={{ color: "#0d3149" }} />
                Our Sponsors
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 py-8">
                {sponsorVenues
                  .filter((venue) => venue.logoUrl)
                  .map((venue) => (
                    <Link
                      key={venue.id}
                      href={`/venue/${venue.id}`}
                      className="group flex items-center justify-center"
                      data-testid={`link-sponsor-${venue.id}`}
                    >
                      <img
                        src={venue.logoUrl}
                        alt={venue.name}
                        className="h-32 w-auto max-w-[280px] object-contain opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 duration-300"
                        data-testid={`img-sponsor-logo-${venue.id}`}
                        title={venue.name}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error(
                            `❌ Failed to load sponsor logo for ${venue.name}:`,
                            venue.logoUrl,
                          );
                          const target = e.currentTarget;
                          // Replace with fallback text
                          const fallback = document.createElement("div");
                          fallback.className =
                            "h-32 flex items-center justify-center px-6 text-xl font-bold text-foreground/70 hover:text-foreground transition-colors border-2 border-border rounded-md";
                          fallback.textContent = venue.name;
                          target.parentElement?.appendChild(fallback);
                          target.remove();
                        }}
                      />
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lower Footer Section - Beige Background with Navy Text */}
      <footer
        className="py-16"
        style={{ backgroundColor: "#f5f1eb", color: "#0d3149" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bowling Alleys this week */}
          {topAlleys && topAlleys.length > 0 && (
            <div className="mb-16">
              <h3
                className="text-xl font-bold mb-6"
                style={{ color: "#0d3149" }}
              >
                Trending Bowling Alleys this week
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                {topAlleys.map((venue, index) => (
                  <div key={venue.id}>
                    <Link
                      href={`/venue/${venue.id}`}
                      className="block group"
                      data-testid={`link-top-alley-${venue.id}`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "#0d3149" }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4
                              className="font-medium group-hover:text-primary transition-colors group-hover:underline truncate"
                              style={{ color: "#0d3149" }}
                            >
                              {venue.name}
                            </h4>
                            {venue.isFoundingPartner && (
                              <Crown
                                className="h-3.5 w-3.5 shrink-0"
                                style={{ fill: "#8d1914", color: "#8d1914" }}
                                data-testid={`icon-founding-partner-${venue.id}`}
                              />
                            )}
                          </div>
                          <p
                            className="text-sm mt-0.5"
                            style={{ color: "#0d3149" }}
                          >
                            {venue.city}, {venue.state}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Branding Section */}
            <div className="lg:col-span-1">
              <div className="mb-4">
                <Image
                  src="/attached_assets/Main_Logo_1767046875251.webp"
                  alt="BAiO Bowling Alleys"
                  width={200}
                  height={80}
                  className="h-20 w-auto"
                />
              </div>

              <p className="mb-4" style={{ color: "#0d3149" }}>
                Your trusted guide to finding the perfect bowling experience.
                Discover, review, and connect with bowling alleys near you.
              </p>

              {/* Social Media Links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://www.facebook.com/people/BowlingAlleysIO/61581141306239/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  style={{ color: "#0d3149" }}
                  data-testid="link-facebook"
                  aria-label="Follow us on Facebook"
                >
                  <SiFacebook className="h-5 w-5" />
                </a>
                <a
                  href="https://www.reddit.com/r/Bowling"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  style={{ color: "#0d3149" }}
                  data-testid="link-reddit"
                  aria-label="Join us on Reddit"
                >
                  <SiReddit className="h-5 w-5" />
                </a>
                <a
                  href="https://www.crunchbase.com/organization/bowlingalleysio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  style={{ color: "#0d3149" }}
                  data-testid="link-crunchbase"
                  aria-label="View our Crunchbase profile"
                >
                  <SiCrunchbase className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4" style={{ color: "#0d3149" }}>
                Quick Links
              </h4>
              <ul className="space-y-3" style={{ color: "#0d3149" }}>
                <li>
                  <Link
                    href="/"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-home"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/locations"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-locations"
                  >
                    Find Alleys
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bowling-leagues"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-leagues"
                  >
                    Bowling Leagues
                  </Link>
                </li>
                <li>
                  <Link
                    href="/experiences"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-experiences"
                  >
                    Explore All Experiences
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bowling-cost"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-pricing"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/specials"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-specials"
                  >
                    Specials
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-blog"
                  >
                    Tips & Tricks
                  </Link>
                </li>
                <li>
                  <Link
                    href="/team-logo-lab"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-logo-lab"
                  >
                    Team Logo Lab
                  </Link>
                </li>
              </ul>
            </div>

            {/* Bowling Guides */}
            <div>
              <h4 className="font-semibold mb-4" style={{ color: "#0d3149" }}>
                Bowling Guides
              </h4>
              <ul className="space-y-3" style={{ color: "#0d3149" }}>
                <li>
                  <Link
                    href="/blog/history-of-bowling"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-history"
                  >
                    History of Bowling
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/how-to-score-bowling"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-scoring"
                  >
                    How to Score Bowling
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/bowling-drinking-games"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-drinking-games"
                  >
                    Bowling Drinking Games
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/bowling-night-out-group-size-guide"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-group-size"
                  >
                    Group Size Guide
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/how-to-aim-in-bowling"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-aiming"
                  >
                    How to Aim in Bowling
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4" style={{ color: "#0d3149" }}>
                Company
              </h4>
              <ul className="space-y-3" style={{ color: "#0d3149" }}>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-contact"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-about"
                  >
                    About BowlingAlleys.io
                  </Link>
                </li>
                <li>
                  <Link
                    href="/team"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-team"
                  >
                    The BAiO Team
                  </Link>
                </li>
                <li>
                  <Link
                    href="/owner"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-owner"
                  >
                    For Alley Owners
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-terms"
                  >
                    Terms Of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-primary transition-colors"
                    data-testid="link-footer-privacy"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-8 border-t text-center space-y-2">
            <p className="text-xs" style={{ color: "#0d3149" }}>
              We strive to keep our prices, specials, and venue information as
              up to date as possible. For the most accurate and current details,
              please visit each bowling alley's official website.
            </p>
            <p style={{ color: "#0d3149" }}>
              © 2025 BowlingAlleys.io. All rights reserved. Find the best
              bowling experiences near you.
            </p>
            <p className="text-xs" style={{ color: "#0d3149" }}>
              Powered by Google Places API and data. Location information and
              business details provided by Google.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


