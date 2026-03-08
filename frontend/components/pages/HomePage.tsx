'use client';

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Helmet } from "react-helmet-async";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import AuthModal from "@/components/AuthModal";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { getVenues, Venue } from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/providers/auth-provider";
const heroImage = "/attached_assets/stock_images/bowling_alley_lanes__1f6cc0b1.jpg";
import {
  Target,
  TrendingUp,
  Heart,
  Footprints,
  Mail,
  MapPin,
  UsersRound,
  Sparkles,
  Navigation,
  ArrowRight,
  Search,
  Loader2,
  Calendar,
} from "lucide-react";
import { getBlogPosts, type BlogPost } from "@/lib/blog";
import {
  lookupZipCode,
  parseCityState,
  parseStateOnly,
  findCityInVenues,
} from "@/lib/location-search";

function stripMarkdownForPreview(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/#{1,6}\s*/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  // Get origin/URL safely for SSR
  const [origin, setOrigin] = useState("https://bowlingalleys.io");
  const [currentUrl, setCurrentUrl] = useState("https://bowlingalleys.io");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setCurrentUrl(window.location.href);
    }
  }, []);

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const [locationInput, setLocationInput] = useState("");
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);


  const handleLocationSearch = async () => {
    const trimmed = locationInput.trim();
    if (!trimmed) return;

    trackEvent("location_search", "engagement", trimmed);
    setLocationSearchError(null);

    const zipOnly = trimmed.replace(/\D/g, "");
    if (zipOnly.length === 5) {
      setLocationSearchLoading(true);
      try {
        const result = await lookupZipCode(trimmed);
        if (result) {
          router.push(
            `/locations/${encodeURIComponent(result.stateAbbr)}/${encodeURIComponent(result.city)}`
          );
        } else {
          setLocationSearchError("Zip code not found. Please try another.");
        }
      } catch {
        setLocationSearchError("Unable to look up zip code. Please try again.");
      } finally {
        setLocationSearchLoading(false);
      }
      return;
    }

    const parsed = parseCityState(trimmed);
    if (parsed) {
      router.push(
        `/locations/${encodeURIComponent(parsed.stateAbbr)}/${encodeURIComponent(parsed.city)}`
      );
      return;
    }

    const stateAbbr = parseStateOnly(trimmed);
    if (stateAbbr) {
      router.push(`/locations/${encodeURIComponent(stateAbbr)}`);
      return;
    }

    const venueMatch = findCityInVenues(venues, trimmed);
    if (venueMatch) {
      router.push(
        `/locations/${encodeURIComponent(venueMatch.stateAbbr)}/${encodeURIComponent(venueMatch.city)}`
      );
      return;
    }

    setLocationSearchError("Could not find that location. Try a city name, state, city and state, or zip code.");
  };

  const {
    data: venues = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["venues"],
    queryFn: getVenues,
  });

  // Calculate stats for tagline
  const venueCount = venues.length;
  const stateCount = new Set(venues.map((v) => v.state).filter(Boolean)).size;

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: getBlogPosts,
  });

  const featuredBlogSlugs = [
    "how-to-score-bowling",
    "bowling-drinking-games",
    "bowling-night-out-group-size-guide",
    "how-to-aim-in-bowling",
  ];
  const featuredPosts = featuredBlogSlugs
    .map((slug) => blogPosts.find((p) => p.slug === slug))
    .filter(Boolean) as BlogPost[];

  // WebSite JSON-LD Structured Data
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BowlingAlleys.io",
    url: "https://bowlingalleys.io",
    description:
      "Find and review bowling alleys near you. End bowling information secrecy with transparent pricing, reviews, and detailed venue information.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          "https://bowlingalleys.io/locations?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Organization JSON-LD Structured Data
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BowlingAlleys.io",
    url: "https://bowlingalleys.io",
    logo: `${origin}/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg`,
    description:
      "Your trusted guide to discovering the perfect bowling experience across the United States. Find bowling alleys, read reviews, compare prices, and discover cosmic bowling, leagues, birthday parties, and more.",
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    knowsAbout: [
      "Bowling Alleys",
      "Bowling Leagues",
      "Cosmic Bowling",
      "Birthday Parties",
      "Arcade Bowling",
      "Bowling Restaurants",
      "Bowling Bars",
    ],
  };

  // FAQ JSON-LD Structured Data
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I find the best bowling alleys near me?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use BowlingAlleys.io to browse verified reviews, compare amenities, and view detailed information about each bowling alley. Our interactive map shows exact locations and you can filter by ratings, pricing, and features.",
        },
      },
      {
        "@type": "Question",
        name: "Can I make reservations at bowling alleys?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reservation features are coming soon to BowlingAlleys.io. Currently, you can find contact information for each venue to call directly for lane reservations and party bookings.",
        },
      },
      {
        "@type": "Question",
        name: "What should I expect to pay for bowling?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most bowling alleys charge $15-25 per game, with shoe rentals around $3-5. Many venues offer discounted rates during off-peak hours and special pricing for groups and leagues.",
        },
      },
      {
        "@type": "Question",
        name: "Are bowling alleys family-friendly?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Most bowling alleys welcome families and offer bumper bowling, lightweight balls for children, and food options suitable for all ages.",
        },
      },
      {
        "@type": "Question",
        name: "Do bowling alleys have cosmic bowling?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most bowling venues offer cosmic or glow bowling on weekend evenings, featuring black lights, music, and special lighting effects for a fun nighttime experience.",
        },
      },
    ],
  };

  if (error || (!isLoading && venues.length === 0)) {
    return <MaintenanceBanner />;
  }

  return (
    <>
      <Helmet>
        <title>
          Find Bowling Alleys Near You | Reviews, Prices & Locations –
          BowlingAlleys.io
        </title>
        <meta
          name="description"
          content="Discover the best bowling alleys near you. Compare prices, read reviews, and explore cosmic bowling, leagues, and birthday party options. End outdated bowling info — BowlingAlleys.io keeps it current."
        />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Find Bowling Alleys Near You | Reviews, Prices & Locations"
        />
        <meta
          property="og:description"
          content="Discover the best bowling alleys near you. Compare prices, read reviews, and explore cosmic bowling, leagues, and birthday party options. End outdated bowling info — BowlingAlleys.io keeps it current."
        />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:site_name" content="BowlingAlleys.io" />
        <meta
          property="og:image"
          content={`${origin}/attached_assets/G-Jrpdja0AITdmi.jpeg`}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta
          property="og:image:alt"
          content="Thank you from the BowlingAlleys.io cat mascot"
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Find Bowling Alleys Near You | Reviews, Prices & Locations"
        />
        <meta
          name="twitter:description"
          content="Discover the best bowling alleys near you. Compare prices, read reviews, and explore cosmic bowling, leagues, and birthday party options. End outdated bowling info — BowlingAlleys.io keeps it current."
        />
        <meta
          name="twitter:image"
          content={`${origin}/attached_assets/G-Jrpdja0AITdmi.jpeg`}
        />
        <meta
          name="twitter:image:alt"
          content="Thank you from the BowlingAlleys.io cat mascot"
        />
      </Helmet>

      {/* WebSite JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      {/* Organization JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* FAQ JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section with Bowling Alley Image */}
        <section className="relative">
          <div className="h-auto min-h-[480px] sm:min-h-[560px] md:min-h-[75vh] relative overflow-hidden">
            <Image
              src={heroImage}
              alt="Modern bowling alley lanes"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Hero Overlay */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white px-4 py-20 sm:py-28 md:py-36 max-w-5xl mx-auto">
                <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 drop-shadow-2xl leading-tight">
                  Find the Best Bowling Alleys Near You — With Prices, Specials,
                  and Real Info
                </h1>
                <p className="text-base sm:text-lg md:text-xl mb-4 drop-shadow-lg font-medium">
                  Compare alleys, see real prices, and plan your bowling night
                  fast.
                </p>

                {/* Location search bar */}
                <div className="w-full max-w-xl mx-auto mb-4">
                  <div className="flex rounded-2xl overflow-hidden bg-white shadow-xl ring-1 ring-black/5">
                    <div className="relative flex-1 flex items-center">
                      <MapPin
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                        style={{ color: "#6b7280" }}
                      />
                      <input
                        type="text"
                        placeholder="Enter your city, state, or zip code"
                        value={locationInput}
                        onChange={(e) => {
                          setLocationInput(e.target.value);
                          setLocationSearchError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLocationSearch();
                        }}
                        disabled={locationSearchLoading}
                        className="h-12 pl-11 pr-4 w-full border-0 rounded-none focus:outline-none focus:ring-0 bg-transparent text-base placeholder:text-[#6b7280]"
                        style={{
                          color: "#111827",
                          caretColor: "#111827",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleLocationSearch}
                      disabled={locationSearchLoading}
                      className="h-12 px-6 flex items-center justify-center bg-[#d52231] hover:bg-[#b91d2a] transition-colors disabled:opacity-70 shrink-0"
                    >
                      {locationSearchLoading ? (
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      ) : (
                        <Search className="h-5 w-5 text-white" />
                      )}
                    </button>
                  </div>
                  {locationSearchError && (
                    <p className="text-sm text-red-200 mt-2 drop-shadow-sm">
                      {locationSearchError}
                    </p>
                  )}
                  <p className="text-sm text-white/90 mt-2 drop-shadow-sm">
                    🎳 {(venueCount > 0 ? venueCount.toLocaleString() : "1,700")}+ bowling alleys across America
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Posts Section */}
        <section className="py-12 md:py-16" style={{ backgroundColor: "#ffffff" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              className="text-2xl font-semibold mb-6"
              style={{ color: "#000000" }}
            >
              Featured Posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredPosts.slice(0, 4).map((post) => (
                <Card
                  key={post.slug}
                  className="relative hover-elevate transition-colors h-full group bg-white border border-gray-200"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-labelledby={`featured-title-${post.slug}`}
                    onClick={() =>
                      trackEvent("home_featured_post_click", "engagement", post.slug)
                    }
                  />
                  <CardHeader>
                    <CardTitle
                      id={`featured-title-${post.slug}`}
                      className="text-lg group-hover:text-primary transition-colors"
                      style={{ color: "#0d3149" }}
                    >
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2" style={{ color: "#6b7280" }}>
                      {post.description}
                    </CardDescription>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" style={{ color: "#6b7280" }} />
                      <time dateTime={post.updated ?? post.date ?? ""}>
                        {(post.updated || post.date)
                          ? new Date(post.updated || post.date || "").toLocaleDateString()
                          : "—"}
                      </time>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(post.tags ?? []).slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {stripMarkdownForPreview(post.content ?? "").slice(0, 120)}
                      {stripMarkdownForPreview(post.content ?? "").length > 120 ? "…" : ""}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button
                asChild
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
                style={{ borderColor: "#d1d5db", color: "#0d3149" }}
              >
                <Link
                  href="/blog"
                  onClick={() =>
                    trackEvent("home_featured_view_all_posts", "engagement", "View all posts")
                  }
                >
                  View all posts
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </div>
    </>
  );
}
