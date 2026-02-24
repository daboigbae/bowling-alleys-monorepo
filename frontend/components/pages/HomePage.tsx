'use client';

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Map from "@/components/Map";
import VenueCard from "@/components/VenueCard";
import AuthModal from "@/components/AuthModal";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { getVenues, getRecentReviews, Venue, Review } from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation, calculateDistance } from "@/lib/geolocation";
const heroImage = "/attached_assets/stock_images/bowling_alley_lanes__1f6cc0b1.jpg";
import {
  Target,
  TrendingUp,
  Heart,
  Footprints,
  Users,
  Mail,
  MapPin,
  UsersRound,
  Sparkles,
  Star,
  Navigation,
  ArrowRight,
  Search,
  Loader2,
} from "lucide-react";
import {
  lookupZipCode,
  parseCityState,
  parseStateOnly,
  findCityInVenues,
} from "@/lib/location-search";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [locationInput, setLocationInput] = useState("");
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const { latitude, longitude, loading: locationLoading } = useGeolocation();
  
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

  const handleLocationSearch = async () => {
    const trimmed = locationInput.trim();
    if (!trimmed) return;

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

  const [sortBy, setSortBy] = useState("recently-updated");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid looks good

  const {
    data: venues = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["venues"],
    queryFn: getVenues,
  });

  const { data: recentReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["recent-reviews"],
    queryFn: () => getRecentReviews(6),
  });

  const handleVenueClick = (venueId: string) => {
    // Find venue details for tracking
    const venue = venues.find((v) => v.id === venueId);
    trackEvent("venue_card_click", "navigation", venue?.name || venueId);

    router.push(`/venue/${venueId}`);
  };

  // Calculate stats for tagline
  const venueCount = venues.length;
  const stateCount = new Set(venues.map((v) => v.state).filter(Boolean)).size;

  // Filter venues based on sort type (only for price sorts)
  const filteredVenues = [...venues].filter((venue) => {
    if (sortBy === "cheapest-hour") {
      const hourly = venue.pricing?.hourly;
      return hourly && parseFloat(String(hourly)) > 0;
    }
    if (sortBy === "cheapest-game") {
      const game = venue.pricing?.game;
      return game && parseFloat(String(game)) > 0;
    }
    return true; // No filter for other sorts
  });

  const sortedVenues = filteredVenues.sort((a, b) => {
    switch (sortBy) {
      case "distance":
        // Sort by distance if user location is available
        if (
          latitude &&
          longitude &&
          a.location?.latitude &&
          b.location?.latitude &&
          a.location?.longitude &&
          b.location?.longitude
        ) {
          const distanceA = calculateDistance(
            latitude,
            longitude,
            a.location.latitude,
            a.location.longitude,
          );
          const distanceB = calculateDistance(
            latitude,
            longitude,
            b.location.latitude,
            b.location.longitude,
          );
          return distanceA - distanceB; // Closest first
        }
        // Fallback to rating if coordinates missing
        return b.avgRating - a.avgRating;
      case "rating":
        return b.avgRating - a.avgRating;
      case "cheapest-hour":
        const aHourly = parseFloat(String(a.pricing?.hourly)) || 999999;
        const bHourly = parseFloat(String(b.pricing?.hourly)) || 999999;
        return aHourly - bHourly;
      case "cheapest-game":
        const aGame = parseFloat(String(a.pricing?.game)) || 999999;
        const bGame = parseFloat(String(b.pricing?.game)) || 999999;
        return aGame - bGame;
      case "leagues":
        return b.avgRating - a.avgRating; // Sort leagues venues by rating
      case "cosmic":
        return b.avgRating - a.avgRating; // Sort cosmic venues by rating
      case "parties":
        return b.avgRating - a.avgRating; // Sort party venues by rating
      case "recently-updated":
        // Sort by updatedAt timestamp, most recent first
        // Handle both Firestore Timestamp and serialized JSON formats
        const getTimestamp = (ts: any): number => {
          if (!ts) return 0;
          if (ts.toDate) return ts.toDate().getTime(); // Firestore Timestamp
          if (ts.seconds) return ts.seconds * 1000; // Serialized from server API
          if (ts._seconds) return ts._seconds * 1000; // Alternative serialization
          const d = new Date(ts);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        const aUpdated = getTimestamp(a.updatedAt);
        const bUpdated = getTimestamp(b.updatedAt);
        return bUpdated - aUpdated;
      default:
        return 0;
    }
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedVenues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVenues = sortedVenues.slice(startIndex, endIndex);

  // Reset to first page when sort changes
  const handleSortChange = (value: string) => {
    trackEvent("venue_sort_change", "engagement", value);
    setSortBy(value);
    setCurrentPage(1);
  };

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
          content={`${origin}/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg`}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta
          property="og:image:alt"
          content="Modern bowling alley with colorful lanes"
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
          content={`${origin}/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg`}
        />
        <meta
          name="twitter:image:alt"
          content="Modern bowling alley with colorful lanes"
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
          <div className="h-auto min-h-[380px] sm:min-h-[460px] md:min-h-[65vh] relative overflow-hidden">
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
              <div className="text-center text-white px-4 py-6 max-w-5xl mx-auto">
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
                </div>

                {/* Main CTAs stacked */}
                <div className="flex flex-col gap-3 items-center">
                  <Link href="/locations">
                    <Card
                      className="text-white hover-elevate px-6 py-3 sm:px-8 sm:py-4 inline-flex items-center gap-2 cursor-pointer border-0"
                      style={{ backgroundColor: "#d52231" }}
                    >
                      <span className="font-semibold text-base sm:text-lg">
                        Explore Bowling Alleys
                      </span>
                    </Card>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Venues Section */}
        <section
          id="venues"
          className="py-8 scroll-mt-16"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* All Venues Grid */}
            <div id="venues-section" className="mb-8 scroll-mt-20">
              <div className="p-4 mb-6 bg-white">
                <div className="flex items-center justify-between">
                  <h3
                    className="font-semibold"
                    style={{ color: "#000000" }}
                    data-testid="text-venue-count"
                  >
                    Showing {startIndex + 1}-
                    {Math.min(endIndex, sortedVenues.length)} of{" "}
                    {sortedVenues.length} Bowling Alleys
                  </h3>
                  <div className="relative">
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger
                        className="w-48 border-gray-300 text-black"
                        style={{ borderColor: '#d1d5db', color: '#0d3149' }}
                        data-testid="select-sort-by"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border border-gray-300 shadow-lg">
                        <SelectItem value="recently-updated" style={{ color: '#0d3149' }}>
                          Recently Updated
                        </SelectItem>
                        {latitude && longitude && (
                          <SelectItem value="distance" style={{ color: '#0d3149' }}>
                            Sort by Distance
                          </SelectItem>
                        )}
                        <SelectItem value="rating" style={{ color: '#0d3149' }}>Sort by Rating</SelectItem>
                        <SelectItem value="cheapest-hour" style={{ color: '#0d3149' }}>
                          Cheapest by Hour
                        </SelectItem>
                        <SelectItem value="cheapest-game" style={{ color: '#0d3149' }}>
                          Cheapest by Game
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-testid="venue-list"
              >
                {isLoading ? (
                  [...Array(itemsPerPage)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-9 bg-gray-200 rounded"></div>
                      </div>
                    </Card>
                  ))
                ) : sortedVenues.length === 0 ? (
                  <Card className="p-6 text-center col-span-full">
                    <p className="text-muted-foreground">
                      No bowling alleys found.
                    </p>
                  </Card>
                ) : (
                  currentVenues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onViewDetails={handleVenueClick}
                      showPrice={
                        sortBy === "cheapest-hour" || sortBy === "cheapest-game"
                      }
                      priceType={
                        sortBy === "cheapest-hour"
                          ? "hourly"
                          : sortBy === "cheapest-game"
                            ? "game"
                            : undefined
                      }
                    />
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && !isLoading && (
                <div className="flex items-center justify-center mt-8 gap-2 sm:gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300 text-black hover:bg-gray-50"
                    style={{ borderColor: '#d1d5db', color: '#0d3149' }}
                    data-testid="button-previous-page"
                  >
                    Previous
                  </Button>

                  <span className="text-sm px-2" style={{ color: '#0d3149' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="border-gray-300 text-black hover:bg-gray-50"
                    style={{ borderColor: '#d1d5db', color: '#0d3149' }}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* What Bowlers Are Saying Section */}
        <section className="py-16" style={{ backgroundColor: "#ffffff" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: "#000000" }}
              >
                What Bowlers Are Saying
              </h2>
              <p
                className="text-xl max-w-3xl mx-auto"
                style={{ color: "#000000" }}
              >
                Join thousands of bowlers who trust BowlingAlleys.io to find
                their next great bowling experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviewsLoading ? (
                [...Array(6)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, j) => (
                          <div
                            key={j}
                            className="w-5 h-5 bg-gray-200 rounded"
                          ></div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </Card>
                ))
              ) : recentReviews.length > 0 ? (
                recentReviews.map((review, index) => (
                  <Link
                    key={index}
                    href={`/venue/${review.venueId}`}
                    data-testid={`review-card-${index}`}
                  >
                    <Card className="p-6 hover-elevate cursor-pointer h-full bg-white border-2 border-gray-300" style={{ borderColor: '#d1d5db' }}>
                      <div className="flex flex-col h-full">
                        {/* User Info Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.userPhotoURL} />
                            <AvatarFallback>
                              {review.userDisplayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: '#0d3149' }}>
                              {review.userDisplayName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? "fill-primary text-primary"
                                        : "text-gray-300"
                                    }`}
                                    aria-hidden="true"
                                  />
                                ))}
                              </div>
                              <span className="text-xs" style={{ color: '#6b7280' }}>
                                {review.createdAt
                                  ?.toDate?.()
                                  ?.toLocaleDateString() || "Recently"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Review Text */}
                        <p className="mb-4 flex-grow leading-relaxed" style={{ color: '#0d3149' }}>
                          {review.text}
                        </p>

                        {/* Venue Name */}
                        <p className="text-sm font-medium" style={{ color: '#0d3149' }}>
                          {review.venueName}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="p-6 col-span-full text-center">
                  <p className="text-muted-foreground">
                    No reviews yet. Be the first to share your bowling
                    experience!
                  </p>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Join the Community CTA Section */}
        <section className="pt-16" style={{ backgroundColor: "#ffffff" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Card className="p-12 bg-white backdrop-blur-sm border-2 border-gray-300" style={{ borderColor: '#d1d5db' }}>
                <div className="max-w-3xl mx-auto">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users
                      className="w-8 h-8 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#0d3149' }}>
                    Help Build the Bowling Community
                  </h2>
                  <p className="text-xl mb-6 leading-relaxed" style={{ color: '#0d3149' }}>
                    Share your experiences, rate local alleys, and help other
                    bowlers discover hidden bowling gems in your area. Every
                    contribution makes BowlingAlleys.io better for the next
                    player.
                  </p>

                  {/* Pin Points Explanation */}
                  <div
                    className="bg-red-50  border rounded-xl p-6 mb-8"
                    style={{ borderColor: "#d52231" }}
                  >
                    <h3
                      className="text-lg font-semibold mb-3 flex items-center gap-2"
                      style={{ color: "#8d1914" }}
                    >
                      <span className="text-2xl">🏆</span> Earn Pin Points
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#8d1914" }}>
                      Pin Points recognize bowlers who help build the community.
                      The more you contribute, the higher you climb!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-white/50  rounded-lg p-3 text-center">
                        <span
                          className="block text-2xl font-bold"
                          style={{ color: "#d52231" }}
                        >
                          +5
                        </span>
                        <span style={{ color: "#8d1914" }}>
                          Discover a new alley
                        </span>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <span
                          className="block text-2xl font-bold"
                          style={{ color: "#d52231" }}
                        >
                          +3
                        </span>
                        <span style={{ color: "#8d1914" }}>Write a review</span>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <span
                          className="block text-2xl font-bold"
                          style={{ color: "#d52231" }}
                        >
                          +1
                        </span>
                        <span style={{ color: "#8d1914" }}>Leave a rating</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ul className="space-y-2 mb-8" style={{ color: '#0d3149' }}>
                      <li>
                        ✓ Leave honest reviews and help others find great
                        bowling alleys
                      </li>
                      <li>✓ Get personalized alley recommendations near you</li>
                      <li>
                        ✓ Stay updated on new venues, events, and promotions
                      </li>
                    </ul>
                    <button
                      className="bg-primary hover-elevate text-primary-foreground px-8 py-4 inline-flex items-center gap-2 cursor-pointer border-0 text-lg font-semibold rounded-xl shadow-sm transition-transform duration-200"
                      onClick={() =>
                        user
                          ? router.push("/locations")
                          : openAuthModal("signup")
                      }
                      data-testid="button-cta-join-community"
                    >
                      {user ? "Find Alleys to Review" : "Start Reviewing"}
                    </button>
                  </div>
                </div>
              </Card>
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
