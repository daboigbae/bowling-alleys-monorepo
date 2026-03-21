'use client';

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getTopAlleys, getHubs, getCityFromHubTitle, abbreviationToState } from "@/lib/firestore";
import Image from "next/image";
import { SiFacebook, SiReddit, SiCrunchbase } from "react-icons/si";
import { Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SuggestLocationBanner from "@/components/SuggestLocationBanner";
import type { FooterVenue } from "@/lib/footer-venues-types";
import { api } from "@/lib/api-client";

interface FooterProps {
  initialTopAlleys?: FooterVenue[];
}

export default function Footer({ initialTopAlleys }: FooterProps) {
  const { data: topAlleys } = useQuery({
    queryKey: ["/top-alleys"],
    queryFn: getTopAlleys,
    initialData: initialTopAlleys,
  });

  const { data: hubs = [] } = useQuery({
    queryKey: ["hubs"],
    queryFn: getHubs,
  });

  // Group hubs by state, sorted alphabetically
  const hubsByState = hubs.reduce<Record<string, { slug: string; city: string }[]>>((acc, hub) => {
    const state = hub.stateCode ?? "";
    const stateName = abbreviationToState[state] || state;
    if (!stateName) return acc;
    const city = hub.city ?? getCityFromHubTitle(hub.title);
    if (!city) return acc;
    if (!acc[stateName]) acc[stateName] = [];
    acc[stateName].push({ slug: hub.slug, city });
    return acc;
  }, {});
  const sortedStates = Object.keys(hubsByState).sort();

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error" | "rateLimit">("idle");
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return;
    setNewsletterStatus("loading");
    try {
      const website = honeypotRef.current?.value ?? "";
      const res = await api.post("/api/newsletter", { email: trimmed, website, source: "footer" });
      if (res.duplicate) {
        setNewsletterStatus("duplicate");
      } else {
        setNewsletterStatus("success");
        setNewsletterEmail("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setNewsletterStatus(message.includes("Too many") ? "rateLimit" : "error");
    }
  };

  return (
    <div className="bg-white">
      {/* Upper Footer - Suggest Location then Bowling Bits, no gap */}
      <div className="py-16 mt-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Bowling Bits first */}
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-1 text-[#0d3149]">
              🎳 Bowling Bits
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Weekly bowling news. No spam. Ever.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 justify-center">
              {/* Honeypot: hidden from users, bots often fill it */}
              <input
                type="text"
                name="website"
                ref={honeypotRef}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden={true}
                className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden"
              />
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  if (newsletterStatus !== "idle") setNewsletterStatus("idle");
                }}
                disabled={newsletterStatus === "loading"}
                className="h-11 px-4 flex-1 min-w-0 max-w-sm mx-auto sm:mx-0 rounded border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d3149] focus:border-transparent"
                aria-label="Email for Bowling Bits newsletter"
              />
              <button
                type="submit"
                disabled={newsletterStatus === "loading"}
                className="h-11 px-6 shrink-0 bg-[#d52231] hover:bg-[#b91d2a] text-white font-medium rounded transition-colors disabled:opacity-70 flex items-center justify-center mx-auto sm:mx-0"
              >
                {newsletterStatus === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Join Bowling Bits"
                )}
              </button>
            </form>
            {newsletterStatus === "success" && (
              <p className="text-sm text-green-700 mt-3" role="status">
                You&apos;re on the list! Bowling Bits launching soon. 🎳
              </p>
            )}
            {newsletterStatus === "duplicate" && (
              <p className="text-sm text-amber-700 mt-3" role="status">
                You&apos;re already on the list!
              </p>
            )}
            {newsletterStatus === "error" && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                Something went wrong. Try again.
              </p>
            )}
            {newsletterStatus === "rateLimit" && (
              <p className="text-sm text-amber-700 mt-3" role="alert">
                Too many signup attempts. Please try again later.
              </p>
            )}
          </div>
          <div className="mt-8">
            <SuggestLocationBanner />
          </div>
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

          {/* Top Bowling Cities by State */}
          {sortedStates.length > 0 && (
            <div className="py-12 border-t">
              <h3 className="text-xl font-bold mb-6" style={{ color: "#0d3149" }}>
                Top Bowling Cities
              </h3>
              <div className="columns-2 md:columns-3 lg:columns-4 gap-8">
                {sortedStates.map((stateName) => (
                  <div key={stateName} className="break-inside-avoid mb-5">
                    <p className="font-bold mb-2" style={{ color: "#0d3149" }}>
                      {stateName}
                    </p>
                    <div className="flex flex-col gap-1">
                      {hubsByState[stateName].map((hub) => (
                        <Link
                          key={hub.slug}
                          href={`/${hub.slug}`}
                          className="hover:text-primary transition-colors"
                          style={{ color: "#0d3149" }}
                        >
                          {hub.city}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Section */}
          <div className="pt-8 text-center space-y-2">
            <p className="text-xs" style={{ color: "#0d3149" }}>
              We strive to keep our prices, specials, and venue information as
              up to date as possible. For the most accurate and current details,
              please visit each bowling alley's official website.
            </p>
            <p style={{ color: "#0d3149" }}>
              © {new Date().getFullYear()} BowlingAlleys.io. All rights reserved. Find the best
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


