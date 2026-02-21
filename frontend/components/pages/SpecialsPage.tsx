import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Plus, ArrowLeft, Mail, Tag, Navigation, ChevronRight } from "lucide-react";
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
  getSpecialsStates,
  getSpecialsVenuesByState,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import { useGeolocation } from "@/lib/geolocation";

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

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

const formatDisplayName = (slug: string) => {
  const normalized = slug.toLowerCase();
  if (stateNameMap[normalized]) {
    return stateNameMap[normalized];
  }
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface SpecialsPageProps { state?: string; city?: string; }
export default function Specials({ state: propState, city: propCity }: SpecialsPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/specials/:state/:city");
  const [stateMatch, stateParams] = useRoute("/specials/:state");
  const [baseMatch] = useRoute("/specials");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Bowling Specials in ${displayCity}, ${displayState} | Deals & Discounts`;
      description = `Find bowling specials and deals in ${displayCity}. Discover discounted games, happy hour pricing, and promotional offers at local bowling alleys.`;
    } else if (displayState) {
      title = `Bowling Specials in ${displayState} | Deals & Promotions`;
      description = `Discover bowling specials across ${displayState}. Find venues with deals, discounts, happy hours, and promotional pricing.`;
    } else {
      title = "Bowling Specials & Deals | Discounts at Bowling Alleys";
      description = "Find bowling alleys offering specials and deals across the U.S. Discover discounted games, happy hour pricing, and promotional offers.";
    }

    document.title = title;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

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
            name: "Specials",
            item: `${window.location.origin}/specials`,
          },
        ]
          .concat(
            displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${displayState} Specials`,
                    item: `${window.location.origin}/specials/${selectedState}`,
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
                    name: `${displayCity} Specials`,
                    item: `${window.location.origin}/specials/${selectedState}/${selectedCity}`,
                  },
                ]
              : [],
          ),
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Bowling Specials in ${displayCity}, ${displayState}`
            : displayState
              ? `Bowling Specials in ${displayState}`
              : "Bowling Specials by State",
        description: description,
      },
    };

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-specials]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-specials", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  // Geolocation for state suggestion
  const { latitude, longitude } = useGeolocation();

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/specials-states"],
    queryFn: getSpecialsStates,
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
  const suggestedState = useMemo((): { state: string; abbreviation: string } | null => {
    if (!latitude || !longitude || states.length === 0) return null;

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 3959;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let closestState: { state: string; abbreviation: string } | null = null;
    let minDistance = Infinity;

    states.forEach((stateName: string) => {
      const abbrev = Object.entries(stateNameMap).find(([key, val]) => 
        val.toLowerCase() === stateName.toLowerCase()
      )?.[0]?.toUpperCase() || stateName.substring(0, 2).toUpperCase();

      const coords = stateCoordinates[abbrev];
      if (coords) {
        const distance = getDistance(latitude, longitude, coords.lat, coords.lng);
        if (distance < minDistance) {
          minDistance = distance;
          closestState = { state: stateName, abbreviation: abbrev };
        }
      }
    });

    return closestState;
  }, [latitude, longitude, states]);

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/specials-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getSpecialsVenuesByState(displayState!)
        : Promise.resolve([]),
    enabled: !!selectedState,
  });

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

    Object.keys(grouped).forEach((city) => {
      grouped[city].sort((a, b) => b.avgRating - a.avgRating);
    });

    return grouped;
  }, [selectedState, stateVenues]);

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

  const filteredVenuesByCity = useMemo(() => {
    if (!selectedCity || !displayCity) return {};

    const cityVenues = venuesByCity[displayCity] || [];
    const result: Record<string, Venue[]> = { [displayCity]: cityVenues };

    if (cityVenues.length < 20) {
      const neededVenues = 20 - cityVenues.length;
      const nearbyVenues: Venue[] = [];

      Object.entries(venuesByCity).forEach(([city, venues]) => {
        if (city !== displayCity) {
          nearbyVenues.push(...venues);
        }
      });

      nearbyVenues.sort((a, b) => b.avgRating - a.avgRating);
      const additionalVenues = nearbyVenues.slice(0, neededVenues);

      const additionalByCity: Record<string, Venue[]> = {};
      additionalVenues.forEach((venue) => {
        const city = venue.city || "Unknown City";
        if (!additionalByCity[city]) {
          additionalByCity[city] = [];
        }
        additionalByCity[city].push(venue);
      });

      Object.entries(additionalByCity).forEach(([city, venues]) => {
        result[city] = venues;
      });
    }

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
    sessionStorage.setItem("venueBackPath", location);

    const venue = stateVenues.find((v) => v.id === venueId);
    trackEvent("specials_venue_click", "navigation", venue?.name || venueId);

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
              data-testid="text-specials-title"
            >
              Browse Bowling Specials by Location
            </h1>
            <p className="text-muted-foreground text-lg">
              Find bowling alleys offering specials and deals in your area. 
              Discover discounted games, happy hour pricing, and promotional offers. 
              Select a state to see specials organized by city.
            </p>

            {/* Featured Bowling Alleys with Specials */}
            <RelatedBlogPosts 
              maxResults={9} 
              title="Alleys with Specials" 
              filterBySpecialsUrl={true}
            />

            {/* Geo-location Based State Suggestion */}
            {suggestedState && (
              <div className="mb-8 mt-8">
                <Link href={`/specials/${suggestedState.abbreviation}`} className="block">
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
                        <span className="text-sm text-muted-foreground hidden sm:block">View specials</span>
                        <Button variant="default" size="sm">
                          View Specials
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
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/specials"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/specials/${selectedState}`}
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
                onClick={() => setLocation(`/specials/${selectedState}`)}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-state"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayState}
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-city-specials-title"
            >
              Bowling Specials in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityVenues = venuesByCity[displayCity!]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? 'alley' : 'alleys'} in ${displayCity} + ${nearbyVenues} nearby with specials`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? 'alley' : 'alleys'} with specials`;
              })()}
            </p>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/specials"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-specials-home"
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
                onClick={() => setLocation("/specials")}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-specials"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All States
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-state-specials-title"
            >
              Bowling Specials in {displayState}
            </h1>

            {/* Featured Bowling Alleys with Specials in this state */}
            <RelatedBlogPosts 
              maxResults={6} 
              title={`Alleys with Specials in ${displayState}`}
              filterBySpecialsUrl={true}
              filterByState={displayState}
            />

            <p className="text-muted-foreground text-lg">
              Select a city to see bowling specials. {stateVenues.length}{" "}
              bowling {stateVenues.length === 1 ? "venue" : "venues"} across{" "}
              {citiesInState.length}{" "}
              {citiesInState.length === 1 ? "city" : "cities"}!
            </p>
          </>
        )}
      </div>

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

      {selectedCity && displayCity && Object.keys(filteredVenuesByCity).length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Map View</h2>
          <CityMap
            venues={Object.values(filteredVenuesByCity).flat()}
            onVenueClick={handleVenueClick}
          />
        </div>
      )}

      {selectedCity && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search venues with specials in this city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-specials-venue-search"
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
              Showing {totalVenues} venues with specials matching "{searchTerm}
              " in {displayCity}
            </p>
          )}
        </div>
      )}

      {!selectedState ? (
        <StateSelector
          states={states}
          isLoading={statesLoading}
          onStateClick={(state) => {
            trackEvent("specials_state_click", "navigation", state);
            setLocation(`/specials/${state.replace(/\s+/g, "-")}`);
          }}
          icon="🏷️"
          testIdPrefix="specials-state"
          description="Click to browse specials"
          emptyStateTitle="No specials locations found"
          emptyStateMessage="We're still building our database of venues with specials."
          emptyStateIcon="🏷️"
        />
      ) : !selectedCity ? (
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
                    "specials_city_click",
                    "navigation",
                    `${city.name}, ${displayState}`,
                  );
                  setLocation(`/specials/${selectedState}/${city.slug}`);
                }}
                data-testid={`card-specials-city-${city.slug}`}
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
                              City Guide
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click to browse specials
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {city.venueCount}{" "}
                        {city.venueCount === 1 ? "venue" : "venues"}
                      </p>
                    </div>
                    <div className="text-2xl">🏷️</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-lg font-semibold mb-2">
              No cities with specials found
            </h3>
            <p className="text-muted-foreground">
              No specials found in {displayState}.
            </p>
          </div>
        )
      ) : venuesLoading ? (
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
          <div className="text-6xl mb-4">🏷️</div>
          <h3 className="text-lg font-semibold mb-2">
            No venues with specials found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No specials found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
              : `No specials found in ${displayCity}, ${displayState}.`}
          </p>
        </div>
      )}

    </div>
  </>
  );
}
