import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Plus, ArrowLeft, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueCard from "@/components/VenueCard";
import StateSelector from "@/components/StateSelector";
import CityMap from "@/components/CityMap";
import { getCityHubUrl, hasCityHub } from "@/lib/cityHubMap";
import {
  getKaraokeStates,
  getKaraokeVenuesByState,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";

// Helper function to create URL-friendly slug
const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
};

// State abbreviation to full name mapping
const stateNameMap: Record<string, string> = {
  co: "Colorado",
  colorado: "Colorado",
  ca: "California",
  california: "California",
  tx: "Texas",
  texas: "Texas",
  ny: "New York",
  "new york": "New York",
  "new-york": "New York",
  fl: "Florida",
  florida: "Florida",
  ga: "Georgia",
  georgia: "Georgia",
  il: "Illinois",
  illinois: "Illinois",
  in: "Indiana",
  indiana: "Indiana",
  ky: "Kentucky",
  kentucky: "Kentucky",
  sc: "South Carolina",
  "south carolina": "South Carolina",
  "south-carolina": "South Carolina",
};

// Helper function to format display name (reverse of createSlug)
const formatDisplayName = (slug: string) => {
  const normalized = slug.toLowerCase();
  // Check if we have a specific mapping for this state
  if (stateNameMap[normalized]) {
    return stateNameMap[normalized];
  }

  // Fall back to default title case formatting
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface KaraokeBowlingPageProps { state?: string; city?: string; }
export default function KaraokeBowling({ state: propState, city: propCity }: KaraokeBowlingPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/karaoke-bowling/:state/:city");
  const [stateMatch, stateParams] = useRoute("/karaoke-bowling/:state");
  const [baseMatch] = useRoute("/karaoke-bowling");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  // Convert display names back from URL slugs
  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  // Set page title and meta description with karaoke focus
  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Karaoke Near Me in ${displayCity}, ${displayState} | Bowling Alleys with Karaoke`;
      description = `Find karaoke near you in ${displayCity}, ${displayState}. Discover bowling alleys with karaoke entertainment, sing while you bowl, and enjoy the perfect night out with friends.`;
    } else if (displayState) {
      title = `Karaoke Near Me in ${displayState} | Bowling Alleys with Karaoke by City`;
      description = `Browse karaoke bowling across ${displayState}. Find bowling alleys with karaoke entertainment where you can sing your heart out between frames in cities throughout the state.`;
    } else {
      title = "Karaoke Near Me | Find Bowling Alleys with Karaoke by State";
      description =
        "Discover karaoke near you at bowling alleys across the United States. Find venues where you can bowl and sing, perfect for group outings and fun nights out.";
    }

    document.title = title;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    // Add structured data for karaoke bowling organization
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: description,
      url: window.location.href,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: window.location.origin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Karaoke Bowling",
            item: `${window.location.origin}/karaoke-bowling`,
          },
        ]
          .concat(
            displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${displayState} Karaoke Bowling`,
                    item: `${window.location.origin}/karaoke-bowling/${selectedState}`,
                  },
                ]
              : [],
          )
          .concat(
            displayCity && displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 4,
                    name: `${displayCity} Karaoke Bowling`,
                    item: `${window.location.origin}/karaoke-bowling/${selectedState}/${selectedCity}`,
                  },
                ]
              : [],
          ),
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Karaoke Bowling in ${displayCity}, ${displayState}`
            : displayState
              ? `Karaoke Bowling in ${displayState}`
              : "Karaoke Bowling by State",
        description: description,
      },
    };

    // Remove existing structured data for karaoke bowling
    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-karaoke]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-karaoke", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  // Query for states list (only states with karaoke bowling)
  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["karaoke-states"],
    queryFn: getKaraokeStates,
  });

  // Query for venues in selected state (only venues with karaoke)
  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["karaoke-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getKaraokeVenuesByState(displayState!)
        : Promise.resolve([]),
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

  // Get cities for state-level view (when no specific city selected)
  const citiesInState = useMemo(() => {
    if (!selectedState || selectedCity) return [];

    return Object.entries(venuesByCity)
      .map(([city, venues]) => ({
        name: city,
        venueCount: venues.length,
        slug: createSlug(city),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [venuesByCity, selectedState, selectedCity]);

  // Filter venues by search term for city-level view and include nearby to fill up to 20
  const filteredVenuesByCity = useMemo(() => {
    if (!selectedCity || !displayCity) return {};

    const cityVenues = venuesByCity[displayCity] || [];
    const result: Record<string, Venue[]> = { [displayCity]: cityVenues };

    // If the city has fewer than 20 venues, add nearby venues from other cities
    if (cityVenues.length < 20) {
      const neededVenues = 20 - cityVenues.length;
      const nearbyVenues: Venue[] = [];

      // Get venues from other cities in the same state
      Object.entries(venuesByCity).forEach(([city, venues]) => {
        if (city !== displayCity) {
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

    // Apply search filter
    if (searchTerm) {
      const searchFiltered: Record<string, Venue[]> = {};
      const searchLower = searchTerm.toLowerCase();

      Object.entries(result).forEach(([city, venues]) => {
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

    return result;
  }, [venuesByCity, displayCity, searchTerm, selectedCity]);

  const totalVenues = selectedCity
    ? Object.values(filteredVenuesByCity).reduce((total, venues) => total + venues.length, 0)
    : stateVenues.length;

  const handleVenueClick = (venueId: string) => {
    // Store karaoke bowling back path for the back button
    sessionStorage.setItem("venueBackPath", location);

    // Find venue details for tracking
    const venue = stateVenues.find((v) => v.id === venueId);
    trackEvent("karaoke_venue_click", "navigation", venue?.name || venueId);

    setLocation(`/venue/${venueId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        {!selectedState ? (
          <>
            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-karaoke-title"
            >
              Browse Karaoke Bowling by Location
            </h1>
            <p className="text-muted-foreground text-lg">
              Find bowling alleys with karaoke games and entertainment centers
              in your area. Select a state to see karaoke bowling opportunities
              organized by city.
            </p>
          </>
        ) : displayCity ? (
          <>
            {/* Breadcrumb navigation for city view */}
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/karaoke-bowling"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/karaoke-bowling/${selectedState}`}
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-state"
              >
                {displayState}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span
                className="text-foreground font-medium"
                data-testid="breadcrumb-city"
              >
                {displayCity}
              </span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => setLocation(`/karaoke-bowling/${selectedState}`)}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-state"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayState}
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-city-karaoke-title"
            >
              Karaoke Bowling in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityVenues = venuesByCity[displayCity!]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? 'alley' : 'alleys'} in ${displayCity} + ${nearbyVenues} nearby with karaoke games`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? 'alley' : 'alleys'} with karaoke games`;
              })()}
            </p>
          </>
        ) : (
          <>
            {/* Breadcrumb navigation for state view */}
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/karaoke-bowling"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-karaoke-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <span
                className="text-foreground font-medium"
                data-testid="breadcrumb-current-state"
              >
                {displayState}
              </span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => setLocation("/karaoke-bowling")}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-karaoke"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All States
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-state-karaoke-title"
            >
              Karaoke Bowling in {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              Select a city to see karaoke bowling venues. {stateVenues.length}{" "}
              bowling {stateVenues.length === 1 ? "venue" : "venues"} across{" "}
              {citiesInState.length}{" "}
              {citiesInState.length === 1 ? "city" : "cities"}!
            </p>
          </>
        )}
      </div>

      {/* City Hub Guide Banner */}
      {selectedCity && displayCity && getCityHubUrl(displayCity) && (
        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <AlertDescription className="text-sm">
            Want to find the best bowling alleys in {displayCity}?{" "}
            <Link
              to={getCityHubUrl(displayCity)!}
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              data-testid="link-city-guide-banner"
            >
              Check the city guide here
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* City Map - Only show when viewing a specific city */}
      {selectedCity && displayCity && Object.keys(filteredVenuesByCity).length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Map View</h2>
          <CityMap
            venues={Object.values(filteredVenuesByCity).flat()}
            onVenueClick={handleVenueClick}
          />
        </div>
      )}

      {/* Search (only show when city is selected) */}
      {selectedCity && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search karaoke bowling venues in this city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-karaoke-venue-search"
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
              Showing {totalVenues} karaoke bowling venues matching "{searchTerm}
              " in {displayCity}
            </p>
          )}
        </div>
      )}

      {!selectedState ? (
        /* State Selection */
        <StateSelector
          states={states}
          isLoading={statesLoading}
          onStateClick={(state) => {
            trackEvent("karaoke_state_click", "navigation", state);
            setLocation(`/karaoke-bowling/${state.replace(/\s+/g, "-")}`);
          }}
          icon="🎤"
          testIdPrefix="karaoke-state"
          description="Click to browse karaoke bowling"
          emptyStateTitle="No karaoke bowling locations found"
          emptyStateMessage="We're still building our database of karaoke bowling venues."
          emptyStateIcon="🎤"
        />
      ) : !selectedCity ? (
        /* State Level - Show City Cards */
        venuesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-6">
                  <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : citiesInState.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {citiesInState.map((city) => (
              <Card
                key={city.slug}
                className="hover-elevate cursor-pointer transition-transform duration-200"
                onClick={() => {
                  trackEvent(
                    "karaoke_city_click",
                    "navigation",
                    `${city.name}, ${displayState}`,
                  );
                  setLocation(`/karaoke-bowling/${selectedState}/${city.slug}`);
                }}
                data-testid={`card-karaoke-city-${city.slug}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{city.name}</h3>
                        {getCityHubUrl(city.name) && (
                          <Link
                            to={getCityHubUrl(city.name)!}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`badge-city-hub-${city.slug}`}
                          >
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs cursor-pointer hover-elevate"
                            >
                              📍 City Guide
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click to browse karaoke bowling
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {city.venueCount}{" "}
                        {city.venueCount === 1 ? "venue" : "venues"}
                      </p>
                    </div>
                    <div className="text-2xl">🎤</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎤</div>
            <h3 className="text-lg font-semibold mb-2">
              No cities with karaoke bowling found
            </h3>
            <p className="text-muted-foreground">
              No karaoke bowling found in {displayState}.
            </p>
          </div>
        )
      ) : /* City Level - Show Venue Cards */
      venuesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
              <div className="p-4 space-y-2">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : Object.keys(filteredVenuesByCity).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(filteredVenuesByCity)
            .sort(([cityA], [cityB]) => {
              if (cityA === displayCity) return -1;
              if (cityB === displayCity) return 1;
              return cityA.localeCompare(cityB);
            })
            .map(([city, venues]) => (
              <div key={city}>
                <h2 className="text-2xl font-semibold mb-4">
                  {city === displayCity ? city : `${city} (Nearby)`}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {venues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onViewDetails={() => handleVenueClick(venue.id)}
                      showRating={true}
                      showPrice={false}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎤</div>
          <h3 className="text-lg font-semibold mb-2">
            No karaoke bowling venues found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No karaoke bowling found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
              : `No karaoke bowling found in ${displayCity}, ${displayState}.`}
          </p>
        </div>
      )}

    </div>
  );
}
