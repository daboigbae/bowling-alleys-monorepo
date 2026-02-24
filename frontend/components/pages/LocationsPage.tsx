'use client';

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation, calculateDistance } from "@/lib/geolocation";
import {
  getVenueStates,
  getVenuesByState,
  getVenueCountsByState,
  getTotalVenueCount,
  abbreviationToState,
  type Venue,
  type StateVenueCount,
} from "@/lib/firestore";
import Image from "next/image";
import { MapPin, Search, ArrowLeft, Trophy, Star, Sparkles, Users, Cake, Image as ImageIcon, ChevronRight, MessageSquare, Navigation } from "lucide-react";
import VenueCard from "@/components/VenueCard";
import AuthModal from "@/components/AuthModal";
import StateSelector from "@/components/StateSelector";
import CityMap from "@/components/CityMap";
import { getCityHubUrl } from "@/lib/cityHubMap";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";


interface LocationsPageProps {
  state?: string;
  city?: string;
}

export default function Locations({ state: propState, city: propCity }: LocationsPageProps = {}) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract route parameters from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const stateIndex = pathParts.indexOf('locations');
  const selectedState = propState || (stateIndex >= 0 && pathParts[stateIndex + 1] ? decodeURIComponent(pathParts[stateIndex + 1]) : null);
  const selectedCity = propCity || (stateIndex >= 0 && pathParts[stateIndex + 2] ? decodeURIComponent(pathParts[stateIndex + 2]) : null);

  const [searchTerm, setSearchTerm] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const { user } = useAuth();
  const {
    latitude,
    longitude,
    loading: locationLoading,
    requestLocation,
  } = useGeolocation();

  // Determine default sort: distance if location available, otherwise rating
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "name">(() => {
    return latitude && longitude ? "distance" : "rating";
  });

  // Update sort to distance when location becomes available
  useEffect(() => {
    if (latitude && longitude && sortBy === "rating") {
      setSortBy("distance");
    }
  }, [latitude, longitude]);

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Query for states list
  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/venue-states"],
    queryFn: getVenueStates,
  });

  // Query for state venue counts (for enhanced state cards)
  const { data: stateVenueCounts = [], isLoading: stateCountsLoading } = useQuery({
    queryKey: ["/api/venue-counts-by-state"],
    queryFn: getVenueCountsByState,
    enabled: !selectedState,
  });

  // Query for total venue count
  const { data: totalVenueCountGlobal = 0 } = useQuery({
    queryKey: ["/api/total-venue-count"],
    queryFn: getTotalVenueCount,
    enabled: !selectedState,
  });

  // Detect user's likely state from geolocation
  const suggestedState = useMemo((): StateVenueCount | null => {
    if (!latitude || !longitude || stateVenueCounts.length === 0) return null;
    
    // State center coordinates (approximate)
    const stateCoordinates: Record<string, { lat: number; lng: number }> = {
      AL: { lat: 32.806671, lng: -86.791130 },
      AK: { lat: 61.370716, lng: -152.404419 },
      AZ: { lat: 33.729759, lng: -111.431221 },
      AR: { lat: 34.969704, lng: -92.373123 },
      CA: { lat: 36.116203, lng: -119.681564 },
      CO: { lat: 39.059811, lng: -105.311104 },
      CT: { lat: 41.597782, lng: -72.755371 },
      DE: { lat: 39.318523, lng: -75.507141 },
      FL: { lat: 27.766279, lng: -81.686783 },
      GA: { lat: 33.040619, lng: -83.643074 },
      HI: { lat: 21.094318, lng: -157.498337 },
      ID: { lat: 44.240459, lng: -114.478828 },
      IL: { lat: 40.349457, lng: -88.986137 },
      IN: { lat: 39.849426, lng: -86.258278 },
      IA: { lat: 42.011539, lng: -93.210526 },
      KS: { lat: 38.526600, lng: -96.726486 },
      KY: { lat: 37.668140, lng: -84.670067 },
      LA: { lat: 31.169546, lng: -91.867805 },
      ME: { lat: 44.693947, lng: -69.381927 },
      MD: { lat: 39.063946, lng: -76.802101 },
      MA: { lat: 42.230171, lng: -71.530106 },
      MI: { lat: 43.326618, lng: -84.536095 },
      MN: { lat: 45.694454, lng: -93.900192 },
      MS: { lat: 32.741646, lng: -89.678696 },
      MO: { lat: 38.456085, lng: -92.288368 },
      MT: { lat: 46.921925, lng: -110.454353 },
      NE: { lat: 41.125370, lng: -98.268082 },
      NV: { lat: 38.313515, lng: -117.055374 },
      NH: { lat: 43.452492, lng: -71.563896 },
      NJ: { lat: 40.298904, lng: -74.521011 },
      NM: { lat: 34.840515, lng: -106.248482 },
      NY: { lat: 42.165726, lng: -74.948051 },
      NC: { lat: 35.630066, lng: -79.806419 },
      ND: { lat: 47.528912, lng: -99.784012 },
      OH: { lat: 40.388783, lng: -82.764915 },
      OK: { lat: 35.565342, lng: -96.928917 },
      OR: { lat: 44.572021, lng: -122.070938 },
      PA: { lat: 40.590752, lng: -77.209755 },
      RI: { lat: 41.680893, lng: -71.511780 },
      SC: { lat: 33.856892, lng: -80.945007 },
      SD: { lat: 44.299782, lng: -99.438828 },
      TN: { lat: 35.747845, lng: -86.692345 },
      TX: { lat: 31.054487, lng: -97.563461 },
      UT: { lat: 40.150032, lng: -111.862434 },
      VT: { lat: 44.045876, lng: -72.710686 },
      VA: { lat: 37.769337, lng: -78.169968 },
      WA: { lat: 47.400902, lng: -121.490494 },
      WV: { lat: 38.491226, lng: -80.954453 },
      WI: { lat: 44.268543, lng: -89.616508 },
      WY: { lat: 42.755966, lng: -107.302490 },
      DC: { lat: 38.897438, lng: -77.026817 },
    };

    let closestState: StateVenueCount | null = null;
    let minDistance = Infinity;

    stateVenueCounts.forEach((stateInfo) => {
      const coords = stateCoordinates[stateInfo.abbreviation];
      if (coords) {
        const distance = calculateDistance(latitude, longitude, coords.lat, coords.lng);
        if (distance < minDistance) {
          minDistance = distance;
          closestState = stateInfo;
        }
      }
    });

    return closestState;
  }, [latitude, longitude, stateVenueCounts]);

  // Query for venues in selected state
  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/venues-by-state", selectedState],
    queryFn: () =>
      selectedState ? getVenuesByState(selectedState) : Promise.resolve([]),
    enabled: !!selectedState,
  });

  // Group venues by city when a state is selected
  const venuesByCity = useMemo(() => {
    if (!selectedState || !stateVenues.length) return {};

    const grouped: Record<string, Venue[]> = {};

    stateVenues.forEach((venue) => {
      const city = venue.city || "Unknown City";
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(venue);
    });

    // Sort venues within each city by rating
    Object.keys(grouped).forEach((city) => {
      grouped[city].sort((a, b) => b.avgRating - a.avgRating);
    });

    return grouped;
  }, [selectedState, stateVenues]);

  // Resolve selectedCity to canonical form (case-insensitive match) for lookups and display
  const canonicalCity = useMemo(() => {
    if (!selectedCity) return undefined;
    const match = Object.keys(venuesByCity).find(
      (k) => k.toLowerCase() === selectedCity.toLowerCase()
    );
    return match ?? selectedCity;
  }, [selectedCity, venuesByCity]);

  // Set page title based on route parameters
  useEffect(() => {
    let title = "Find Bowling Alleys by Location - BowlingAlleys.io";
    if (selectedState && canonicalCity) {
      title = `Bowling Alleys in ${canonicalCity}, ${selectedState} - BowlingAlleys.io`;
    } else if (selectedState) {
      title = `Bowling Alleys in ${selectedState} - BowlingAlleys.io`;
    }
    document.title = title;
  }, [selectedState, canonicalCity]);

  // Filter venues by search term and selected city
  const filteredVenuesByCity = useMemo(() => {
    let filtered = venuesByCity;

    // Filter by selected city if specified, and include nearby cities to fill up to 20 venues
    if (canonicalCity) {
      const cityVenues = venuesByCity[canonicalCity] || [];
      const result: Record<string, Venue[]> = { [canonicalCity]: cityVenues };

      // If the city has fewer than 20 venues, add nearby venues from other cities
      if (cityVenues.length < 20) {
        const neededVenues = 20 - cityVenues.length;
        const nearbyVenues: Venue[] = [];

        // Get venues from other cities in the same state
        Object.entries(venuesByCity).forEach(([city, venues]) => {
          if (city.toLowerCase() !== canonicalCity.toLowerCase()) {
            nearbyVenues.push(...venues);
          }
        });

        // Sort by rating and take what we need
        nearbyVenues.sort((a, b) => b.avgRating - a.avgRating);
        const additionalVenues = nearbyVenues.slice(0, neededVenues);

        // Group additional venues by their city
        const additionalByCity: Record<string, Venue[]> = {};
        additionalVenues.forEach((venue) => {
          const city = venue.city || "Unknown City";
          if (!additionalByCity[city]) {
            additionalByCity[city] = [];
          }
          additionalByCity[city].push(venue);
        });

        // Add to result
        Object.entries(additionalByCity).forEach(([city, venues]) => {
          result[city] = venues;
        });
      }

      filtered = result;
    }

    // Apply search filter
    if (searchTerm) {
      const searchFiltered: Record<string, Venue[]> = {};
      const searchLower = searchTerm.toLowerCase();

      Object.entries(filtered).forEach(([city, venues]) => {
        const filteredVenues = venues.filter(
          (venue) =>
            venue.name.toLowerCase().includes(searchLower) ||
            venue.address.toLowerCase().includes(searchLower) ||
            venue.description?.toLowerCase().includes(searchLower),
        );

        if (filteredVenues.length > 0) {
          searchFiltered[city] = filteredVenues;
        }
      });

      return searchFiltered;
    }

    return filtered;
  }, [venuesByCity, searchTerm, canonicalCity]);

  const totalVenues = Object.values(filteredVenuesByCity).reduce(
    (total, venues) => total + venues.length,
    0,
  );

  // Get top 5 bowling alleys in the selected city (sorted by rating)
  const top5Venues = useMemo(() => {
    if (!canonicalCity) return [];
    const cityVenues = venuesByCity[canonicalCity] || [];
    return cityVenues.slice(0, 5);
  }, [canonicalCity, venuesByCity]);

  // Collect photos from venues in the city (deduplicated)
  const cityPhotos = useMemo(() => {
    if (!canonicalCity) return [];
    const cityVenues = venuesByCity[canonicalCity] || [];
    const photos: { url: string; venueName: string }[] = [];
    const seenUrls = new Set<string>();
    
    cityVenues.forEach(venue => {
      // Add cover image
      if (venue.coverImageUrl && !seenUrls.has(venue.coverImageUrl)) {
        seenUrls.add(venue.coverImageUrl);
        photos.push({ url: venue.coverImageUrl, venueName: venue.name });
      }
      // Add image URLs
      if (venue.imageUrls && venue.imageUrls.length > 0) {
        venue.imageUrls.forEach(url => {
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            photos.push({ url, venueName: venue.name });
          }
        });
      }
      // Add legacy photo URL
      if (venue.photoUrl && !seenUrls.has(venue.photoUrl)) {
        seenUrls.add(venue.photoUrl);
        photos.push({ url: venue.photoUrl, venueName: venue.name });
      }
    });
    
    return photos.slice(0, 6); // Limit to 6 photos for gallery
  }, [canonicalCity, venuesByCity]);

  // Reviews summary stats for the city
  const reviewsStats = useMemo(() => {
    if (!canonicalCity) return null;
    const cityVenues = venuesByCity[canonicalCity] || [];
    const totalReviews = cityVenues.reduce((sum, v) => sum + (v.reviewCount || 0), 0);
    const venuesWithRatings = cityVenues.filter(v => v.avgRating > 0);
    const avgRating = venuesWithRatings.length > 0
      ? venuesWithRatings.reduce((sum, v) => sum + v.avgRating, 0) / venuesWithRatings.length
      : 0;
    const highestRated = cityVenues.length > 0 ? cityVenues[0] : null; // Already sorted by rating
    
    return {
      totalReviews,
      avgRating,
      venueCount: cityVenues.length,
      highestRated
    };
  }, [canonicalCity, venuesByCity]);

  // Check which experiences are available in this city based on amenities
  const availableExperiences = useMemo(() => {
    if (!canonicalCity) return { cosmic: false, leagues: false, birthday: false };
    const cityVenues = venuesByCity[canonicalCity] || [];
    
    const hasCosmic = cityVenues.some(v => 
      v.amenities?.some(a => a.toLowerCase().includes('cosmic') || a.toLowerCase().includes('glow'))
    );
    const hasLeagues = cityVenues.some(v => 
      v.amenities?.some(a => a.toLowerCase().includes('league'))
    );
    const hasBirthday = cityVenues.some(v => 
      v.amenities?.some(a => a.toLowerCase().includes('birthday') || a.toLowerCase().includes('party'))
    );
    
    // Default to showing all experiences since not all venues have complete amenity data
    return {
      cosmic: hasCosmic || cityVenues.length > 0,
      leagues: hasLeagues || cityVenues.length > 0,
      birthday: hasBirthday || cityVenues.length > 0
    };
  }, [selectedCity, venuesByCity]);

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        {!selectedState ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1
                className="text-4xl md:text-5xl font-bold text-foreground mb-4"
                data-testid="text-locations-title"
              >
                Find Bowling Alleys Near You (By State)
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Browse over {totalVenueCountGlobal > 0 ? totalVenueCountGlobal.toLocaleString() : "1,000"} bowling alleys in the U.S. Pick a state to see every alley, ratings, leagues, and cosmic bowling options.
              </p>
            </div>

            {/* Bowling Alleys to Explore Section - Second thing users see */}
            <RelatedBlogPosts maxResults={9} title="Bowling Alleys to Explore" />

            {/* Geo-location Based State Suggestion */}
            {suggestedState && (
              <div className="mb-8 mt-8">
                <Link href={`/locations/${encodeURIComponent(suggestedState.abbreviation)}`} className="block">
                  <Card className="w-full bg-primary/5 border-primary/20 hover-elevate cursor-pointer" data-testid="card-suggested-state">
                    <CardContent className="py-4 px-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Navigation className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Based on your location</p>
                          <p className="font-semibold text-lg">{suggestedState.state} ({suggestedState.abbreviation})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground hidden sm:block">{suggestedState.count} bowling alleys</span>
                        <Button variant="default" size="sm">
                          View Alleys
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )}
          </>
        ) : canonicalCity ? (
          <>
            {/* Breadcrumb navigation for city view */}
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/locations"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/locations/${encodeURIComponent(selectedState!)}`}
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-state"
              >
                {selectedState}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground">
                {canonicalCity}
              </span>
            </nav>
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/locations/${encodeURIComponent(selectedState!)}`}>
                <Button variant="outline" data-testid="button-back-to-cities">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to {selectedState}
                </Button>
              </Link>
              <h1
                className="text-3xl font-bold text-foreground"
                data-testid="text-city-title"
              >
                Bowling Alleys in {canonicalCity}, {selectedState}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg mb-4">
              {(() => {
                const cityVenues = venuesByCity[canonicalCity]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? "alley" : "alleys"} in ${canonicalCity} + ${nearbyVenues} nearby`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? "alley" : "alleys"} found`;
              })()}
            </p>
            {/* City Guide Banner */}
            {getCityHubUrl(canonicalCity) && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  <span className="text-sm">
                    Want to find the best bowling alleys in {canonicalCity}?{" "}
                    <Link
                      href={getCityHubUrl(canonicalCity)!}
                      className="font-semibold text-primary hover:underline"
                      data-testid="link-city-guide-banner"
                    >
                      Check the city guide here
                    </Link>
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <>
            {/* Breadcrumb navigation for state view */}
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/locations"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home-state"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground">
                {selectedState}
              </span>
            </nav>
            <div className="flex items-center gap-4 mb-4">
              <Link href="/locations">
                <Button variant="outline" data-testid="button-back-to-states">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to States
                </Button>
              </Link>
              <h1
                className="text-3xl font-bold text-foreground"
                data-testid="text-state-title"
              >
                Bowling Alleys in {selectedState}
              </h1>
            </div>
            {/* Related Bowling Alleys Section */}
            <div className="my-8">
              <RelatedBlogPosts maxResults={9} title={`Bowling Alleys to Explore in ${selectedState}`} filterByState={selectedState} />
            </div>

            <p className="text-muted-foreground text-lg">
              {stateVenues.length} bowling{" "}
              {stateVenues.length === 1 ? "alley" : "alleys"} across{" "}
              {Object.keys(venuesByCity).length}{" "}
              {Object.keys(venuesByCity).length === 1 ? "city" : "cities"}
            </p>
          </>
        )}
      </div>

      {/* Search (only show when state is selected, but not on city pages) */}
      {selectedState && !selectedCity && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search venues in this state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-venue-search"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                data-testid="button-clear-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {totalVenues} venues matching "{searchTerm}"
            </p>
          )}
        </div>
      )}

      {!selectedState ? (
        /* Enhanced State Selection Grid */
        <div className="space-y-8">
          {/* Search Bar */}
          <div className="max-w-md mx-auto text-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
                data-testid="input-state-search"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  data-testid="button-clear-state-search"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Badge variant="secondary" className="text-sm px-4 py-1 mt-3">
              <MapPin className="h-4 w-4 mr-1 inline" />
              {stateVenueCounts.length} States Available
            </Badge>
          </div>

          {/* State Cards Grid */}
          {stateCountsLoading || statesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stateVenueCounts.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No states found</h3>
              <p className="text-muted-foreground">No bowling alley locations available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stateVenueCounts
                .filter(s => {
                  if (!searchTerm.trim()) return true;
                  const term = searchTerm.toLowerCase();
                  return s.state.toLowerCase().includes(term) || s.abbreviation.toLowerCase().includes(term);
                })
                .map((stateInfo) => (
                  <Link
                    key={stateInfo.abbreviation}
                    href={`/locations/${encodeURIComponent(stateInfo.abbreviation)}`}
                    data-testid={`card-state-${stateInfo.abbreviation.toLowerCase()}`}
                  >
                    <Card className={`hover-elevate active-elevate-2 cursor-pointer h-full transition-all ${suggestedState?.abbreviation === stateInfo.abbreviation ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-base truncate">{stateInfo.state}</h3>
                              <Badge variant="outline" className="text-xs shrink-0">{stateInfo.abbreviation}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {stateInfo.count} bowling {stateInfo.count === 1 ? "alley" : "alleys"}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          )}

          {/* Popular Cities Section */}
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6 text-center">Popular City Guides</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { city: "Denver", state: "CO", url: "/best-bowling-in-denver" },
                { city: "Chicago", state: "IL", url: "/best-bowling-in-chicago" },
                { city: "El Paso", state: "TX", url: "/best-bowling-in-el-paso" },
                { city: "Charleston", state: "SC", url: "/best-bowling-in-charleston-sc" },
                { city: "Houston", state: "TX", url: "/best-bowling-in-houston" },
                { city: "Los Angeles", state: "CA", url: "/best-bowling-in-los-angeles" },
              ].map((item) => (
                <Link key={item.city} href={item.url} data-testid={`link-city-${item.city.toLowerCase().replace(/\s+/g, "-")}`}>
                  <Card className="hover-elevate cursor-pointer h-full">
                    <CardContent className="p-3 text-center">
                      <p className="font-medium text-sm">{item.city}</p>
                      <p className="text-xs text-muted-foreground">{item.state}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Bowling Experiences Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Explore Bowling Experiences</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/cosmic-bowling" data-testid="link-cosmic-bowling">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="font-medium">Cosmic Bowling</p>
                    <p className="text-xs text-muted-foreground">Glow & neon nights</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/bowling-leagues" data-testid="link-bowling-leagues">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="font-medium">Bowling Leagues</p>
                    <p className="text-xs text-muted-foreground">Join a team</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/bowling-birthday-party" data-testid="link-birthday-parties">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <Cake className="h-8 w-8 mx-auto mb-2 text-pink-500" />
                    <p className="font-medium">Birthday Parties</p>
                    <p className="text-xs text-muted-foreground">Celebrate here</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/experiences" data-testid="link-all-experiences">
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="font-medium">All Experiences</p>
                    <p className="text-xs text-muted-foreground">View all options</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          </div>
      ) : /* Venues by City in Selected State */
      venuesLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="p-4 border rounded">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : canonicalCity ? (
        /* Enhanced City Landing Page */
        Object.keys(filteredVenuesByCity).length > 0 ? (
          <div className="space-y-12">
            {/* Photo Gallery Section */}
            {cityPhotos.length > 0 && (
              <section data-testid="section-city-photos">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <ImageIcon className="h-6 w-6 text-primary" />
                  Photos from {canonicalCity} Bowling Alleys
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {cityPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="aspect-video rounded-lg overflow-hidden relative group"
                      data-testid={`photo-${idx}`}
                    >
                      <Image
                        src={photo.url}
                        alt={`${photo.venueName} bowling alley`}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white text-sm font-medium">{photo.venueName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top 5 Bowling Alleys Section */}
            {top5Venues.length > 0 && (
              <section data-testid="section-top-5">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  Top {Math.min(5, top5Venues.length)} Bowling Alleys in {canonicalCity}
                </h2>
                <p className="text-muted-foreground mb-6">
                  The highest-rated bowling centers based on community reviews
                </p>
                <div className="space-y-4">
                  {top5Venues.map((venue, idx) => (
                    <Card
                      key={venue.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => {
                        sessionStorage.setItem("venueBackPath", pathname);
                        router.push(`/venue/${venue.id}`);
                      }}
                      data-testid={`top-venue-${idx + 1}`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary">#{idx + 1}</span>
                        </div>
                        {(() => {
                          const imgSrc = venue.coverImageUrl || venue.photoUrl;
                          return imgSrc ? (
                            <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden relative">
                              <Image
                                src={imgSrc}
                                alt={venue.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                          ) : null;
                        })()}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{venue.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{venue.address}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-5 w-5 fill-current" />
                            <span className="font-bold text-lg">{venue.avgRating.toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{venue.reviewCount} reviews</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Bowling Experiences Section */}
            <section data-testid="section-experiences">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-500" />
                Bowling Experiences in {canonicalCity}
              </h2>
              <p className="text-muted-foreground mb-6">
                Discover unique bowling experiences available in {canonicalCity}, {selectedState}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableExperiences.cosmic && (
                  <Link
                    href={`/cosmic-bowling/${encodeURIComponent(selectedState!)}/${encodeURIComponent(canonicalCity)}`}
                    data-testid="link-cosmic-bowling"
                  >
                    <Card className="hover-elevate h-full">
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-purple-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Cosmic Bowling</h3>
                        <p className="text-sm text-muted-foreground">
                          Glow-in-the-dark bowling with music and lights
                        </p>
                        <span className="text-primary mt-4 inline-flex items-center text-sm font-medium">
                          Find Cosmic Bowling <ChevronRight className="h-4 w-4 ml-1" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {availableExperiences.leagues && (
                  <Link
                    href={`/bowling-leagues/${encodeURIComponent(selectedState!)}/${encodeURIComponent(canonicalCity)}`}
                    data-testid="link-leagues"
                  >
                    <Card className="hover-elevate h-full">
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Users className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Bowling Leagues</h3>
                        <p className="text-sm text-muted-foreground">
                          Join competitive and recreational bowling leagues
                        </p>
                        <span className="text-primary mt-4 inline-flex items-center text-sm font-medium">
                          Find Leagues <ChevronRight className="h-4 w-4 ml-1" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {availableExperiences.birthday && (
                  <Link
                    href={`/bowling-birthday-party/${encodeURIComponent(selectedState!)}/${encodeURIComponent(canonicalCity)}`}
                    data-testid="link-birthday"
                  >
                    <Card className="hover-elevate h-full">
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                          <Cake className="h-8 w-8 text-pink-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Birthday Parties</h3>
                        <p className="text-sm text-muted-foreground">
                          Book bowling birthday party packages
                        </p>
                        <span className="text-primary mt-4 inline-flex items-center text-sm font-medium">
                          Find Party Venues <ChevronRight className="h-4 w-4 ml-1" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            </section>

            {/* Reviews Summary Section */}
            {reviewsStats && (
              <section data-testid="section-reviews-summary">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                  Reviews Summary for {canonicalCity}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-primary">{reviewsStats.venueCount}</p>
                      <p className="text-sm text-muted-foreground">Bowling Alleys</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-yellow-500">{reviewsStats.avgRating.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Average Rating</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-green-500">{reviewsStats.totalReviews}</p>
                      <p className="text-sm text-muted-foreground">Total Reviews</p>
                    </CardContent>
                  </Card>
                  {reviewsStats.highestRated && (
                    <Card
                      className="hover-elevate cursor-pointer"
                      onClick={() => {
                        sessionStorage.setItem("venueBackPath", pathname);
                        router.push(`/venue/${reviewsStats.highestRated!.id}`);
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                          <Trophy className="h-5 w-5" />
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">{reviewsStats.highestRated.avgRating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{reviewsStats.highestRated.name}</p>
                        <p className="text-xs text-muted-foreground">Highest Rated</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>
            )}

            {/* Map Section */}
            {Object.keys(filteredVenuesByCity).length > 0 && (
              <section data-testid="section-map">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-red-500" />
                  Map of Bowling Alleys in {canonicalCity}
                </h2>
                <CityMap
                  venues={Object.values(filteredVenuesByCity).flat()}
                  onVenueClick={(venueId) => {
                    sessionStorage.setItem("venueBackPath", pathname);
                    router.push(`/venue/${venueId}`);
                  }}
                />
              </section>
            )}

            {/* All Bowling Alleys Section */}
            <section data-testid="section-all-venues">
              <h2 className="text-2xl font-bold mb-4">All Bowling Alleys</h2>
              {Object.entries(filteredVenuesByCity)
                .sort(([cityA], [cityB]) => {
                  if (cityA.toLowerCase() === canonicalCity.toLowerCase()) return -1;
                  if (cityB.toLowerCase() === canonicalCity.toLowerCase()) return 1;
                  return cityA.localeCompare(cityB);
                })
                .map(([city, venues]) => (
                  <div key={city} className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">
                      {city.toLowerCase() === canonicalCity.toLowerCase() ? (
                        `${city}`
                      ) : (
                        <span className="text-muted-foreground">
                          Nearby in {city}
                        </span>
                      )}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {venues.map((venue) => (
                        <VenueCard
                          key={venue.id}
                          venue={venue}
                          onViewDetails={(venueId) => {
                            sessionStorage.setItem("venueBackPath", pathname);
                            router.push(`/venue/${venueId}`);
                          }}
                          showRating={true}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </section>
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No venues found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? `No venues found matching "${searchTerm}" in ${canonicalCity}, ${selectedState}.`
                : `No bowling alleys found in ${canonicalCity}, ${selectedState}.`}
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear search
              </Button>
            )}
          </div>
        )
      ) : /* Show city selection for selected state */
      Object.keys(venuesByCity).length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Object.entries(venuesByCity)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([city, venues]) => (
                <Link
                  key={city}
                  href={`/locations/${encodeURIComponent(selectedState!)}/${encodeURIComponent(city)}`}
                  data-testid={`card-city-${city.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Card className="cursor-pointer hover-elevate">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold">{city}</h3>
                        {getCityHubUrl(city) && (
                          <Link
                            href={getCityHubUrl(city)!}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`badge-city-hub-${city.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 cursor-pointer hover-elevate"
                            >
                              📍 City Guide
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {venues.length} venue{venues.length !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          Click to view
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>

          {/* Show venues grouped by city when searching */}
          {searchTerm && Object.keys(filteredVenuesByCity).length > 0 && (
            <div className="space-y-8">
              <h3 className="text-xl font-semibold">Search Results</h3>
              {Object.entries(filteredVenuesByCity)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([city, venues]) => (
                  <div key={city}>
                    <div className="flex items-center space-x-3 mb-4">
                      <h4 className="text-lg font-semibold">{city}</h4>
                      <Badge variant="secondary">
                        {venues.length} result{venues.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {venues.map((venue) => (
                        <VenueCard
                          key={venue.id}
                          venue={venue}
                          onViewDetails={(venueId) => {
                            // Store current location path for back navigation
                            sessionStorage.setItem("venueBackPath", pathname);
                            router.push(`/venue/${venueId}`);
                          }}
                          showRating={true}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No venues found</h3>
          <p className="text-muted-foreground">
            No bowling alleys found in {selectedState}.
          </p>
        </div>
      )}

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
