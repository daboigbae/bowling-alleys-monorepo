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
  getSnackBarStates,
  getSnackBarVenuesByState,
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

interface SnackBarPageProps { state?: string; city?: string; }
export default function SnackBar({ state: propState, city: propCity }: SnackBarPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/snack-bar/:state/:city");
  const [stateMatch, stateParams] = useRoute("/snack-bar/:state");
  const [baseMatch] = useRoute("/snack-bar");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Bowling Alleys with Snack Bars in ${displayCity}, ${displayState} | Food & Bowling`;
      description = `Find bowling alleys with snack bars in ${displayCity}, ${displayState}. Discover bowling centers with food service, concessions, and refreshments to fuel your game.`;
    } else if (displayState) {
      title = `Bowling Alleys with Snack Bars in ${displayState} | Food & Bowling by City`;
      description = `Browse bowling alleys with snack bars across ${displayState}. Find bowling centers with food service, concessions, and refreshments in cities throughout the state.`;
    } else {
      title = "Bowling Alleys with Snack Bars Near Me | Food & Refreshments While You Bowl";
      description =
        "Discover bowling alleys with snack bars across the United States. Find bowling centers with food service, concessions, nachos, pizza, and refreshments to keep you fueled while you bowl.";
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
            name: "Snack Bars",
            item: `${window.location.origin}/snack-bar`,
          },
        ]
          .concat(
            displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${displayState} Snack Bars`,
                    item: `${window.location.origin}/snack-bar/${selectedState}`,
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
                    name: `${displayCity} Snack Bars`,
                    item: `${window.location.origin}/snack-bar/${selectedState}/${selectedCity}`,
                  },
                ]
              : [],
          ),
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Snack Bars in ${displayCity}, ${displayState}`
            : displayState
              ? `Snack Bars in ${displayState}`
              : "Snack Bars by State",
        description: description,
      },
    };

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-snack-bar]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-snack-bar", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/snack-bar-states"],
    queryFn: getSnackBarStates,
  });

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/snack-bar-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getSnackBarVenuesByState(displayState!)
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

    return grouped;
  }, [selectedState, stateVenues]);

  const filteredVenues = useMemo(() => {
    if (!selectedCity) return [];

    const citySlug = selectedCity.toLowerCase();
    const matchingCityKey = Object.keys(venuesByCity).find(
      (city) => createSlug(city) === citySlug
    );

    if (!matchingCityKey) return [];

    const cityVenues = venuesByCity[matchingCityKey];

    if (!searchTerm) return cityVenues;

    return cityVenues.filter(
      (venue) =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.address?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [selectedCity, venuesByCity, searchTerm]);

  const handleStateClick = (state: string) => {
    const stateSlug = createSlug(state);
    setLocation(`/snack-bar/${stateSlug}`);
    trackEvent("snack_bar_state_select", "navigation", state);
  };

  const handleBackToStates = () => {
    setLocation("/snack-bar");
  };

  const handleBackToState = () => {
    if (selectedState) {
      const stateSlug = createSlug(selectedState);
      setLocation(`/snack-bar/${stateSlug}`);
    }
  };

  const handleCityClick = (city: string) => {
    const citySlug = createSlug(city);
    const stateSlug = createSlug(selectedState!);
    setLocation(`/snack-bar/${stateSlug}/${citySlug}`);
    trackEvent("snack_bar_city_select", "navigation", city);
  };

  if (!baseMatch && !stateMatch && !cityMatch) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          {selectedCity ? (
            <Button
              variant="ghost"
              onClick={handleBackToState}
              className="mb-4"
              data-testid="button-back-to-state"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {displayState}
            </Button>
          ) : selectedState ? (
            <Button
              variant="ghost"
              onClick={handleBackToStates}
              className="mb-4"
              data-testid="button-back-to-states"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All States
            </Button>
          ) : null}

          <h1 className="text-4xl font-bold mb-4">
            {displayCity && displayState
              ? `Bowling Alleys with Snack Bars in ${displayCity}, ${displayState}`
              : displayState
                ? `Bowling Alleys with Snack Bars in ${displayState}`
                : "Bowling Alleys with Snack Bars"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {displayCity && displayState
              ? `Find the best bowling alleys with snack bars in ${displayCity}. Enjoy classic bowling alley food like nachos, pizza, hot dogs, and refreshments while you bowl with friends and family.`
              : displayState
                ? `Discover bowling alleys with snack bars across ${displayState}. Find bowling centers with food service, concessions, and refreshments in cities throughout the state.`
                : "Find bowling alleys with snack bars across the United States. Keep your energy up with classic bowling alley fare like nachos, pizza, hot dogs, and refreshing drinks while you bowl."}
          </p>
        </div>

        {!selectedState && (
          <StateSelector
            states={states}
            onStateClick={handleStateClick}
            isLoading={statesLoading}
            emptyStateMessage="No bowling alleys with snack bars found."
          />
        )}

        {selectedState && !selectedCity && (
          <div className="space-y-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">
                Select a City in {displayState}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(venuesByCity)
                  .sort()
                  .map((city) => (
                    <Card
                      key={city}
                      className="hover-elevate cursor-pointer transition-all"
                      onClick={() => handleCityClick(city)}
                      data-testid={`city-card-${createSlug(city)}`}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            {city}
                          </span>
                          <Badge variant="secondary">
                            {venuesByCity[city].length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        )}

        {selectedCity && displayCity && displayState && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {filteredVenues.length}{" "}
                  {filteredVenues.length === 1 ? "Venue" : "Venues"} in{" "}
                  {displayCity}
                </h2>
              </div>
              <div className="w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search venues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                    data-testid="input-search-venues"
                  />
                </div>
              </div>
            </div>

            {hasCityHub(displayCity) && (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>
                      Looking for a complete guide to bowling in {displayCity}?
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="ml-4"
                    >
                      <Link href={getCityHubUrl(displayCity)!}>
                        View City Guide
                      </Link>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <CityMap venues={filteredVenues} />

            {venuesLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg"></div>
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVenues.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVenues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    onViewDetails={(venueId) => setLocation(`/venue/${venueId}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍕</div>
                <h3 className="text-lg font-semibold mb-2">
                  No snack bar venues found
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? `No snack bars found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
                    : `No snack bars found in ${displayCity}, ${displayState}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
