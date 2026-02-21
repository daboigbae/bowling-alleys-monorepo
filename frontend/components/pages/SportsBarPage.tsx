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
  getSportsBarStates,
  getSportsBarVenuesByState,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";

// Helper function to create URL-friendly slug
const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  if (stateNameMap[normalized]) {
    return stateNameMap[normalized];
  }

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface SportsBarPageProps { state?: string; city?: string; }
export default function SportsBar({ state: propState, city: propCity }: SportsBarPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/sports-bar/:state/:city");
  const [stateMatch, stateParams] = useRoute("/sports-bar/:state");
  const [baseMatch] = useRoute("/sports-bar");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Bowling Alleys with Sports Bars in ${displayCity}, ${displayState} | Watch the Game`;
      description = `Discover bowling alleys with sports bars in ${displayCity}, ${displayState}. Find bowling centers with sports bars, big screens, live games, and great food & drinks in your area.`;
    } else if (displayState) {
      title = `Bowling Alleys with Sports Bars in ${displayState} | Watch the Game by City`;
      description = `Browse bowling alleys with sports bars across ${displayState}. Find bowling centers with sports bars, big screens, live games, and great food & drinks in cities throughout the state.`;
    } else {
      title = "Bowling Alleys with Sports Bars Near Me | Watch the Game While You Bowl";
      description =
        "Discover bowling alleys with sports bars across the United States. Find bowling centers with sports bars, big screens, live games, and great food & drinks in your state and city.";
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
            name: "Sports Bars",
            item: `${window.location.origin}/sports-bar`,
          },
        ]
          .concat(
            displayState
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `${displayState} Sports Bars`,
                    item: `${window.location.origin}/sports-bar/${selectedState}`,
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
                    name: `${displayCity} Sports Bars`,
                    item: `${window.location.origin}/sports-bar/${selectedState}/${selectedCity}`,
                  },
                ]
              : [],
          ),
      },
      mainEntity: {
        "@type": "ItemList",
        name:
          displayCity && displayState
            ? `Sports Bars in ${displayCity}, ${displayState}`
            : displayState
              ? `Sports Bars in ${displayState}`
              : "Sports Bars by State",
        description: description,
      },
    };

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-sports-bar]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-sports-bar", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [displayState, displayCity, selectedState, selectedCity]);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/sports-bar-states"],
    queryFn: getSportsBarStates,
  });

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/sports-bar-venues-by-state", selectedState],
    queryFn: () =>
      selectedState
        ? getSportsBarVenuesByState(displayState!)
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

    // Find the city key that matches the selected city slug
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
    setLocation(`/sports-bar/${stateSlug}`);
    trackEvent("sports_bar_state_select", "navigation", state);
  };

  const handleBackToStates = () => {
    setLocation("/sports-bar");
  };

  const handleBackToState = () => {
    if (selectedState) {
      const stateSlug = createSlug(selectedState);
      setLocation(`/sports-bar/${stateSlug}`);
    }
  };

  const handleCityClick = (city: string) => {
    const citySlug = createSlug(city);
    const stateSlug = createSlug(selectedState!);
    setLocation(`/sports-bar/${stateSlug}/${citySlug}`);
    trackEvent("sports_bar_city_select", "navigation", city);
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
              ? `🏀 Bowling Alleys with Sports Bars in ${displayCity}, ${displayState}`
              : displayState
                ? `🏀 Bowling Alleys with Sports Bars in ${displayState}`
                : "🏀 Bowling Alleys with Sports Bars"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {displayCity && displayState
              ? `Find the best bowling alleys with sports bars in ${displayCity}. Watch the game on big screens while you bowl, enjoy great food and drinks, and experience the perfect combination of sports and entertainment.`
              : displayState
                ? `Discover bowling alleys with sports bars across ${displayState}. Watch live sports on big screens while you bowl, enjoy great food and drinks at bowling centers throughout the state.`
                : "Find bowling alleys with sports bars across the United States. Watch live games on big screens while you bowl, enjoy great food and drinks, and experience the perfect combination of sports and entertainment."}
          </p>
        </div>

        {!selectedState && (
          <StateSelector
            states={states}
            onStateClick={handleStateClick}
            isLoading={statesLoading}
            emptyStateMessage="No bowling alleys with sports bars found."
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
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-lg font-semibold mb-2">
                  No sports bar venues found
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? `No sports bars found matching "${searchTerm}" in ${displayCity}, ${displayState}.`
                    : `No sports bars found in ${displayCity}, ${displayState}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
