import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Plus, ArrowLeft, Mail, Navigation, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueCard from "@/components/VenueCard";
import StateSelector from "@/components/StateSelector";
import CityMap from "@/components/CityMap";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import { getCityHubUrl, hasCityHub } from "@/lib/cityHubMap";
import {
  getLeagueStates,
  getLeagueVenuesByState,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";
import { useGeolocation } from "@/lib/geolocation";

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

interface BowlingLeaguesPageProps { state?: string; city?: string; }
export default function BowlingLeagues({ state: propState, city: propCity }: BowlingLeaguesPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/bowling-leagues/:state/:city");
  const [stateMatch, stateParams] = useRoute("/bowling-leagues/:state");
  const [baseMatch] = useRoute("/bowling-leagues");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  // Convert display names back from URL slugs
  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  // Set page title and meta description with league focus
  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Bowling Leagues in ${displayCity}, ${displayState} | Find League Bowling Near You`;
      description = `Discover bowling leagues in ${displayCity}, ${displayState}. Find seasonal bowling leagues with competitive play, weekly schedules, and team opportunities in your area.`;
    } else if (displayState) {
      title = `Bowling Leagues in ${displayState} | League Bowling Locations by City`;
      description = `Browse bowling leagues across ${displayState}. Find bowling alleys offering seasonal leagues, competitive bowling, and team play opportunities in cities throughout the state.`;
    } else {
      title =
        "Bowling Leagues Near Me | Find League Bowling Locations by State";
      description =
        "Discover bowling leagues across the United States. Find bowling alleys offering seasonal leagues, competitive play, and team opportunities in your state and city.";
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

    // Add structured data for league organization
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
            name: "Bowling Leagues",
            item: `${window.location.origin}/bowling-leagues`,
          },
        ]
          .concat(
            displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${displayState} Leagues`,
                    item: `${window.location.origin}/bowling-leagues/${selectedState}`,
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
                    name: `${displayCity} Leagues`,
                    item: `${window.location.origin}/bowling-leagues/${selectedState}/${selectedCity}`,
                  },
                ]
              : [],
          ),
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Bowling Leagues in ${displayCity}, ${displayState}`
            : displayState
              ? `Bowling Leagues in ${displayState}`
              : "Bowling Leagues by State",
        description: description,
      },
    };

    // Remove existing structured data for leagues
    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-leagues]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-leagues", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  // Geolocation for state suggestion
  const { latitude, longitude } = useGeolocation();

  // Query for states list (only states with leagues)
  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/league-states"],
    queryFn: getLeagueStates,
  });

  // State coordinates for geo-based suggestion
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

  // Detect user's likely state from geolocation
  const suggestedState = useMemo((): { state: string; abbreviation: string; count: number } | null => {
    if (!latitude || !longitude || states.length === 0) return null;

    // Calculate distance to each state center
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let closestState: { state: string; abbreviation: string; count: number } | null = null;
    let minDistance = Infinity;

    states.forEach((stateName: string) => {
      // Find abbreviation for this state
      const abbrev = Object.entries(stateNameMap).find(([key, val]) => 
        val.toLowerCase() === stateName.toLowerCase()
      )?.[0]?.toUpperCase() || stateName.substring(0, 2).toUpperCase();

      const coords = stateCoordinates[abbrev];
      if (coords) {
        const distance = getDistance(latitude, longitude, coords.lat, coords.lng);
        if (distance < minDistance) {
          minDistance = distance;
          closestState = { state: stateName, abbreviation: abbrev, count: 0 };
        }
      }
    });

    return closestState;
  }, [latitude, longitude, states]);

  // Query for venues in selected state (only venues with leagues)
  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/league-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getLeagueVenuesByState(displayState!)
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
    // Store leagues back path for the back button
    sessionStorage.setItem("venueBackPath", location);

    // Find venue details for tracking
    const venue = stateVenues.find((v) => v.id === venueId);
    trackEvent("league_venue_click", "navigation", venue?.name || venueId);

    setLocation(`/venue/${venueId}`);
  };

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        {!selectedState ? (
          <>
            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-leagues-title"
            >
              Browse Bowling Leagues by Location
            </h1>
            <p className="text-muted-foreground text-lg">
              Find bowling alleys offering seasonal leagues in your area. Select
              a state to see league opportunities organized by city.
            </p>
            
            {/* Featured alleys with league sign-up links */}
            <RelatedBlogPosts 
              maxResults={9} 
              title="Alleys with League Sign-Up" 
              filterByLeaguesUrl={true} 
            />

            {/* Geo-location Based State Suggestion */}
            {suggestedState && (
              <div className="mb-8 mt-8">
                <Link href={`/bowling-leagues/${suggestedState.abbreviation}`} className="block">
                  <Card className="w-full bg-primary/5 border-primary/20 hover-elevate cursor-pointer" data-testid="card-suggested-state">
                    <CardContent className="py-4 px-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Navigation className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Based on your location</p>
                          <p className="font-semibold text-lg">{suggestedState.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground hidden sm:block">View leagues</span>
                        <Button variant="default" size="sm">
                          View Leagues
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )}
          </>
        ) : displayCity ? (
          <>
            {/* Breadcrumb navigation for city view */}
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/bowling-leagues"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/bowling-leagues/${selectedState}`}
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
                onClick={() => setLocation(`/bowling-leagues/${selectedState}`)}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-state"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayState}
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-city-leagues-title"
            >
              Bowling Leagues in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityVenues = venuesByCity[displayCity!]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? 'alley' : 'alleys'} in ${displayCity} + ${nearbyVenues} nearby offering league play`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? 'alley' : 'alleys'} offering league play`;
              })()}
            </p>
          </>
        ) : (
          <>
            {/* Breadcrumb navigation for state view */}
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/bowling-leagues"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-leagues-home"
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
                onClick={() => setLocation("/bowling-leagues")}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-leagues"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All States
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-state-leagues-title"
            >
              Bowling Leagues in {displayState}
            </h1>

            {/* Featured alleys with league sign-up links in this state */}
            <RelatedBlogPosts 
              maxResults={6} 
              title={`Alleys with League Sign-Up in ${displayState}`}
              filterByLeaguesUrl={true}
              filterByState={displayState}
            />

            <p className="text-muted-foreground text-lg">
              Select a city to see bowling leagues. {stateVenues.length} bowling{" "}
              {stateVenues.length === 1 ? "league" : "leagues"} across{" "}
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
              placeholder="Search league venues in this city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-league-venue-search"
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
              Showing {totalVenues} league venues matching "{searchTerm}" in{" "}
              {displayCity}
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
            trackEvent("league_state_click", "navigation", state);
            setLocation(`/bowling-leagues/${state.replace(/\s+/g, "-")}`);
          }}
          icon="🏆"
          testIdPrefix="league-state"
          description="Click to browse leagues"
          emptyStateTitle="No league locations found"
          emptyStateMessage="We're still building our database of bowling leagues."
          emptyStateIcon="🏆"
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
                    "league_city_click",
                    "navigation",
                    `${city.name}, ${displayState}`,
                  );
                  setLocation(`/bowling-leagues/${selectedState}/${city.slug}`);
                }}
                data-testid={`card-league-city-${city.slug}`}
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
                        Click to browse leagues
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {city.venueCount}{" "}
                        {city.venueCount === 1 ? "venue" : "venues"}
                      </p>
                    </div>
                    <div className="text-2xl">🏆</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold mb-2">
              No cities with leagues found
            </h3>
            <p className="text-muted-foreground">
              No bowling leagues found in {displayState}.
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
              // Show selected city first
              if (cityA === displayCity) return -1;
              if (cityB === displayCity) return 1;
              return cityA.localeCompare(cityB);
            })
            .map(([city, venues]) => (
              <div key={city}>
                <h3 className="text-xl font-semibold mb-4">
                  {city === displayCity ? (
                    `${city}`
                  ) : (
                    <span className="text-muted-foreground">
                      Nearby in {city}
                    </span>
                  )}
                </h3>
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
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold mb-2">No league venues found</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No bowling leagues found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
              : `No bowling leagues found in ${displayCity}, ${displayState}.`}
          </p>
        </div>
      )}

    </div>
  </>
  );
}
