import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowLeft, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueCard from "@/components/VenueCard";
import StateSelector from "@/components/StateSelector";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import CityMap from "@/components/CityMap";
import { getCityHubUrl } from "@/lib/cityHubMap";
import {
  getSeniorStates,
  getSeniorVenuesByState,
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

interface SeniorBowlingPageProps { state?: string; city?: string; }
export default function SeniorBowling({ state: propState, city: propCity }: SeniorBowlingPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/senior-bowling/:state/:city");
  const [stateMatch, stateParams] = useRoute("/senior-bowling/:state");
  const [baseMatch] = useRoute("/senior-bowling");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Senior Bowling Discounts in ${displayCity}, ${displayState} | 55+ Specials`;
      description = `Find senior bowling discounts in ${displayCity}, ${displayState}. Discover bowling alleys offering 55+ specials, senior rates, and daytime discount programs.`;
    } else if (displayState) {
      title = `Senior Bowling Discounts in ${displayState} | 55+ Bowling Specials`;
      description = `Browse senior bowling discounts across ${displayState}. Find bowling alleys offering 55+ specials, reduced rates, and senior-friendly programs in cities throughout the state.`;
    } else {
      title = "Senior Bowling Discounts Near Me | 55+ Bowling Specials by State";
      description =
        "Discover senior bowling discounts across the United States. Find bowling alleys offering 55+ specials, reduced daytime rates, and senior-friendly bowling programs in your state and city.";
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
            name: "Senior Bowling",
            item: window.location.origin + "/senior-bowling",
          },
          ...(displayState
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: displayState,
                  item:
                    window.location.origin +
                    `/senior-bowling/${selectedState}`,
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
            ? `Senior Bowling Discounts in ${displayCity}, ${displayState}`
            : displayState
              ? `Senior Bowling Discounts in ${displayState}`
              : "Senior Bowling Discounts by State",
        description: description,
      },
    };

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-senior]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-senior", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/senior-states"],
    queryFn: getSeniorStates,
  });

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/senior-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getSeniorVenuesByState(displayState!)
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
    trackEvent("senior_venue_click", "navigation", venue?.name || venueId);

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
              data-testid="text-senior-title"
            >
              Browse Senior Bowling Discounts by Location
            </h1>
            <p className="text-muted-foreground text-lg">
              Find bowling alleys offering 55+ senior discounts in your area. Select
              a state to see senior bowling specials organized by city.
            </p>
          </>
        ) : selectedCity ? (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/senior-bowling"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-senior-home"
              >
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/senior-bowling/${selectedState}`}
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-senior-state"
              >
                {displayState}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span
                className="text-foreground font-medium"
                data-testid="breadcrumb-current-city"
              >
                {displayCity}
              </span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => setLocation(`/senior-bowling/${selectedState}`)}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-state"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayState}
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-city-senior-title"
            >
              Senior Bowling Discounts in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityVenues = venuesByCity[displayCity!]?.length || 0;
                const nearbyVenues = totalVenues - cityVenues;
                if (nearbyVenues > 0) {
                  return `${cityVenues} ${cityVenues === 1 ? 'alley' : 'alleys'} in ${displayCity} + ${nearbyVenues} nearby offering senior discounts`;
                }
                return `${totalVenues} bowling ${totalVenues === 1 ? 'alley' : 'alleys'} offering senior discounts`;
              })()}
            </p>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link
                href="/senior-bowling"
                className="text-primary hover:text-primary/80 underline"
                data-testid="breadcrumb-senior-home"
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
                onClick={() => setLocation("/senior-bowling")}
                className="text-primary hover:text-primary/80"
                data-testid="button-back-to-senior"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All States
              </Button>
            </div>

            <h1
              className="text-3xl font-bold text-foreground mb-4"
              data-testid="text-state-senior-title"
            >
              Senior Bowling Discounts in {displayState}
            </h1>

            <p className="text-muted-foreground text-lg">
              Select a city to see senior bowling discounts. {stateVenues.length} bowling{" "}
              {stateVenues.length === 1 ? "alley" : "alleys"} across{" "}
              {citiesInState.length}{" "}
              {citiesInState.length === 1 ? "city" : "cities"}!
            </p>
          </>
        )}
      </div>

      {selectedCity && displayCity && getCityHubUrl(displayCity) && (
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Looking for more bowling info?{" "}
            <Link
              href={getCityHubUrl(displayCity) || "#"}
              className="underline font-medium hover:text-blue-600"
              data-testid="link-city-guide"
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
              placeholder="Search senior bowling venues in this city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-senior-venue-search"
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
              Showing {totalVenues} senior venues matching "{searchTerm}" in{" "}
              {displayCity}
            </p>
          )}
        </div>
      )}

      {!selectedState ? (
        <>
          <RelatedBlogPosts 
            maxResults={9} 
            title="Bowling Alleys with Senior Discounts" 
            filterBySeniorDiscount={true} 
          />
          
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">Browse by State</h2>
            <StateSelector
              states={states}
              isLoading={statesLoading}
              onStateClick={(state: string) => {
                trackEvent("senior_state_select", "navigation", state);
                setLocation(`/senior-bowling/${state.toLowerCase()}`);
              }}
              icon="💰"
              testIdPrefix="senior-state"
              description="Click to browse senior discounts"
              emptyStateTitle="No States Found"
              emptyStateMessage="No states found with senior bowling discounts"
              emptyStateIcon="💰"
            />
          </div>
        </>
      ) : !selectedCity ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {venuesLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : citiesInState.length > 0 ? (
            citiesInState.map((city) => (
              <Card
                key={city.slug}
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => {
                  trackEvent("senior_city_select", "navigation", city.name);
                  setLocation(
                    `/senior-bowling/${selectedState}/${city.slug}`,
                  );
                }}
                data-testid={`card-city-${city.slug}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{city.name}</h3>
                      <Badge variant="secondary" className="mt-2">
                        {city.venueCount}{" "}
                        {city.venueCount === 1 ? "venue" : "venues"}
                      </Badge>
                    </div>
                    <div className="text-2xl">💰</div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-lg font-semibold mb-2">No cities found</h3>
              <p className="text-muted-foreground">
                No cities found with senior bowling discounts in {displayState}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {venuesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-40 bg-muted rounded mb-4" />
                    <div className="h-6 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : Object.keys(filteredVenuesByCity).length > 0 ? (
            Object.entries(filteredVenuesByCity).map(([city, venues]) => (
              <div key={city}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  {city}
                  {city !== displayCity && (
                    <Badge variant="outline" className="text-xs">
                      Nearby
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {venues.length} {venues.length === 1 ? "venue" : "venues"}
                  </Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onViewDetails={handleVenueClick}
                      showRating={true}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-lg font-semibold mb-2">No venues found</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? `No venues found matching "${searchTerm}"`
                  : `No senior bowling venues found in ${displayCity}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
