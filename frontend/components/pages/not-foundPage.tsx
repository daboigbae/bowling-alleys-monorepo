'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import VenueCard from "@/components/VenueCard";
import { getVenues, getHubs, getCityFromHubTitle, abbreviationToState } from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";
import { Search, Home, MapPin } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState("rating");

  const {
    data: venues = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["venues"],
    queryFn: getVenues,
  });

  const { data: hubs = [] } = useQuery({
    queryKey: ["hubs"],
    queryFn: getHubs,
  });

  const handleVenueClick = (venueId: string) => {
    // Find venue details for tracking
    const venue = venues.find((v) => v.id === venueId);
    trackEvent("venue_card_click_404", "navigation", venue?.name || venueId);

    router.push(`/venue/${venueId}`);
  };

  const sortedVenues = [...venues].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.avgRating - a.avgRating;
      case "reviews":
        return b.reviewCount - a.reviewCount;
      case "distance":
        // TODO: Implement geolocation-based distance sorting
        return 0;
      default:
        return 0;
    }
  });

  // Show only top 6 venues on 404 page
  const featuredVenues = sortedVenues.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* 404 Header Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Search className="w-12 h-12 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            We couldn't find what you're looking for
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The page you're looking for doesn't exist or has been moved. But
            don't worry — we've got some great bowling alleys for you to
            discover!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="px-8" data-testid="button-404-home">
                <Home className="w-5 h-5 mr-2" aria-hidden="true" />
                Go Home
              </Button>
            </Link>
            <Link href="/locations">
              <Button
                variant="outline"
                size="lg"
                className="px-8"
                data-testid="button-404-locations"
              >
                <Search className="w-5 h-5 mr-2" aria-hidden="true" />
                Find Bowling Alleys
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* City Hub Links Section */}
      <section className="py-16 bg-muted/20 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Popular City Bowling Guides
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore comprehensive guides for top bowling destinations across the country with detailed venue information, pricing, and local insights.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {hubs.slice(0, 12).map((hub) => {
              const city = hub.city ?? getCityFromHubTitle(hub.title);
              const state = hub.stateCode ?? "";
              const cardDesc = hub.description || hub.subtitle || `Bowling guide for ${city}`;
              return (
                <Link key={hub.slug} href={`/${hub.slug}`} data-testid={`link-hub-${hub.slug}`}>
                  <Card
                    className="p-6 hover-elevate active-elevate-2 transition-all cursor-pointer h-full"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{city}, {abbreviationToState[state] || state}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{cardDesc}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded">Guide Available</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <Link href="/city-guides">
              <Button variant="outline" size="lg" data-testid="button-view-all-cities">
                View All Cities
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Venues Section */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Discover Bowling Alleys</h2>
            <p className="text-muted-foreground">Browse our top-rated venues</p>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredVenues.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onViewDetails={(venueId) => {
                    trackEvent("venue_card_click_404", "navigation", venue.name);
                    router.push(`/venue/${venueId}`);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
