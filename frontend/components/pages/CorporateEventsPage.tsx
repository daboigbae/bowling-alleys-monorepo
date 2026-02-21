import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowLeft, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueCard from "@/components/VenueCard";
import StateSelector from "@/components/StateSelector";
import CityMap from "@/components/CityMap";
import { getCityHubUrl } from "@/lib/cityHubMap";
import {
  getCorporateStates,
  getCorporateVenuesByState,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";

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

interface CorporateEventsPageProps { state?: string; city?: string; }
export default function CorporateEvents({ state: propState, city: propCity }: CorporateEventsPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/corporate-events/:state/:city");
  const [stateMatch, stateParams] = useRoute("/corporate-events/:state");
  const [baseMatch] = useRoute("/corporate-events");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Corporate Events & Team Building in ${displayCity}, ${displayState} | Bowling Venues`;
      description = `Find bowling alleys perfect for corporate events and team building in ${displayCity}, ${displayState}. Discover venues with private party rooms, catering, and group packages.`;
    } else if (displayState) {
      title = `Corporate Events & Team Building in ${displayState} | Bowling Venues by City`;
      description = `Browse bowling venues for corporate events across ${displayState}. Find bowling alleys with private rooms, catering, and team building packages in cities throughout the state.`;
    } else {
      title = "Corporate Events & Team Building | Find Bowling Venues by State";
      description =
        "Discover bowling venues perfect for corporate events and team building across the United States. Find bowling alleys with private party rooms, catering, and group packages.";
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
            name: "Corporate Events",
            item: window.location.origin + "/corporate-events",
          },
          ...(displayState
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: displayState,
                  item:
                    window.location.origin +
                    `/corporate-events/${selectedState}`,
                },
              ]
            : []),
          ...(displayCity && displayState
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: displayCity,
                  item: window.location.href,
                },
              ]
            : []),
        ],
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Corporate Event Venues in ${displayCity}, ${displayState}`
            : displayState
              ? `Corporate Event Venues in ${displayState}`
              : "Corporate Event Venues by State",
        description: description,
      },
    };

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-corporate]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-corporate", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/corporate-states"],
    queryFn: getCorporateStates,
  });

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/corporate-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getCorporateVenuesByState(displayState!)
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
    trackEvent("corporate_venue_click", "navigation", venue?.name || venueId);
    setLocation(`/venue/${venueId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        {!selectedState ? (
          <>
            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-corporate-title"
            >
              Corporate Events & Team Building
            </h1>
            <p className="text-muted-foreground text-lg">
              Find bowling alleys perfect for corporate events, team building,
              and company outings. Select a state to discover venues with
              private party rooms, catering, and group packages.
            </p>
          </>
        ) : displayCity ? (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/corporate-events"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/corporate-events/${selectedState}`}
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
                onClick={() => setLocation(`/corporate-events/${selectedState}`)}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-state"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayState}
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-city-corporate-title"
            >
              Corporate Events in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityVenues = venuesByCity[displayCity!]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? 'venue' : 'venues'} in ${displayCity} + ${nearbyVenues} nearby for corporate events`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? 'venue' : 'venues'} for corporate events`;
              })()}
            </p>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/corporate-events"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-corporate-home"
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
                onClick={() => setLocation("/corporate-events")}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-corporate"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All States
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-state-corporate-title"
            >
              Corporate Events in {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              Select a city to see corporate event venues. {stateVenues.length}{" "}
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
              placeholder="Search corporate event venues in this city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-corporate-venue-search"
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
              Showing {totalVenues} corporate event venues matching "{searchTerm}
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
            trackEvent("corporate_state_click", "navigation", state);
            setLocation(`/corporate-events/${state.replace(/\s+/g, "-")}`);
          }}
          icon="💼"
          testIdPrefix="corporate-state"
          description="Click to browse corporate event venues"
          emptyStateTitle="No corporate event venues found"
          emptyStateMessage="We're still building our database of corporate event venues."
          emptyStateIcon="💼"
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
                    "corporate_city_click",
                    "navigation",
                    `${city.name}, ${displayState}`,
                  );
                  setLocation(`/corporate-events/${selectedState}/${city.slug}`);
                }}
                data-testid={`card-corporate-city-${city.slug}`}
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
                        Click to browse corporate event venues
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {city.venueCount}{" "}
                        {city.venueCount === 1 ? "venue" : "venues"}
                      </p>
                    </div>
                    <div className="text-2xl">💼</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💼</div>
            <h3 className="text-lg font-semibold mb-2">
              No cities with corporate event venues found
            </h3>
            <p className="text-muted-foreground">
              No corporate event venues found in {displayState}.
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
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-lg font-semibold mb-2">
            No corporate event venues found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No corporate event venues found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
              : `No corporate event venues found in ${displayCity}, ${displayState}.`}
          </p>
        </div>
      )}

    </div>
  );
}
