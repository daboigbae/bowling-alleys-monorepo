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
  getBattingCagesStates,
  getBattingCagesVenuesByState,
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

interface BattingCagesPageProps { state?: string; city?: string; }
export default function BattingCages({ state: propState, city: propCity }: BattingCagesPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/batting-cages/:state/:city");
  const [stateMatch, stateParams] = useRoute("/batting-cages/:state");
  const [baseMatch] = useRoute("/batting-cages");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Batting Cages in ${displayCity}, ${displayState} | Bowling Alleys with Baseball Practice`;
      description = `Find bowling alleys with batting cages in ${displayCity}. Practice your swing while enjoying bowling — check amenities, hours, and pricing near you.`;
    } else if (displayState) {
      title = `Batting Cages in ${displayState} | Bowling & Baseball Practice Facilities`;
      description = `Discover bowling alleys with batting cages across ${displayState}. Perfect for family fun combining bowling and baseball practice.`;
    } else {
      title = "Batting Cages at Bowling Alleys | Baseball Practice & Bowling Fun";
      description = "Find bowling alleys with batting cages across the U.S. Enjoy both bowling and baseball practice at entertainment centers near you.";
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
            name: "Batting Cages",
            item: `${window.location.origin}/batting-cages`,
          },
        ]
          .concat(
            displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${displayState} Batting Cages`,
                    item: `${window.location.origin}/batting-cages/${selectedState}`,
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
                    name: `${displayCity} Batting Cages`,
                    item: `${window.location.origin}/batting-cages/${selectedState}/${selectedCity}`,
                  },
                ]
              : [],
          ),
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Batting Cages in ${displayCity}, ${displayState}`
            : displayState
              ? `Batting Cages in ${displayState}`
              : "Batting Cages by State",
        description: description,
      },
    };

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-batting-cages]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-batting-cages", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/batting-cages-states"],
    queryFn: getBattingCagesStates,
  });

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/batting-cages-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getBattingCagesVenuesByState(displayState!)
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
    trackEvent("batting_cages_venue_click", "navigation", venue?.name || venueId);

    setLocation(`/venue/${venueId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        {!selectedState ? (
          <>
            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-batting-cages-title"
            >
              Browse Batting Cages by Location
            </h1>
            <p className="text-muted-foreground text-lg">
              Find bowling alleys with batting cages in your area. Perfect for
              combining family bowling with baseball practice. Select a state to
              see venues organized by city.
            </p>
          </>
        ) : displayCity ? (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/batting-cages"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/batting-cages/${selectedState}`}
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
                onClick={() => setLocation(`/batting-cages/${selectedState}`)}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-state"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayState}
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-city-batting-cages-title"
            >
              Batting Cages in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityVenues = venuesByCity[displayCity!]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? 'venue' : 'venues'} in ${displayCity} + ${nearbyVenues} nearby with batting cages`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? 'venue' : 'venues'} with batting cages`;
              })()}
            </p>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/batting-cages"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-batting-cages-home"
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
                onClick={() => setLocation("/batting-cages")}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-batting-cages"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All States
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-state-batting-cages-title"
            >
              Batting Cages in {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              Select a city to see venues with batting cages. {stateVenues.length}{" "}
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
              placeholder="Search venues with batting cages in this city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-batting-cages-venue-search"
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
              Showing {totalVenues} venues with batting cages matching "{searchTerm}
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
            trackEvent("batting_cages_state_click", "navigation", state);
            setLocation(`/batting-cages/${state.replace(/\s+/g, "-")}`);
          }}
          icon="⚾"
          testIdPrefix="batting-cages-state"
          description="Click to browse batting cages"
          emptyStateTitle="No batting cage locations found"
          emptyStateMessage="We're still building our database of venues with batting cages."
          emptyStateIcon="⚾"
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
                    "batting_cages_city_click",
                    "navigation",
                    `${city.name}, ${displayState}`,
                  );
                  setLocation(`/batting-cages/${selectedState}/${city.slug}`);
                }}
                data-testid={`card-batting-cages-city-${city.slug}`}
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
                        Click to browse batting cages
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {city.venueCount}{" "}
                        {city.venueCount === 1 ? "venue" : "venues"}
                      </p>
                    </div>
                    <div className="text-2xl">⚾</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚾</div>
            <h3 className="text-lg font-semibold mb-2">
              No cities with batting cages found
            </h3>
            <p className="text-muted-foreground">
              No batting cages found in {displayState}.
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
          <div className="text-6xl mb-4">⚾</div>
          <h3 className="text-lg font-semibold mb-2">
            No venues with batting cages found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No batting cages found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
              : `No batting cages found in ${displayCity}, ${displayState}.`}
          </p>
        </div>
      )}

    </div>
  );
}
