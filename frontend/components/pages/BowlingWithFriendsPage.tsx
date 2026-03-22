import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueCard from "@/components/VenueCard";
import StateSelector from "@/components/StateSelector";
import CityMap from "@/components/CityMap";
import { useCityHubMap } from "@/lib/cityHubMap";
import {
  getBowlingWithFriendsStates,
  getBowlingWithFriendsVenuesByState,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";

const createSlug = (text: string) =>
  text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const stateNameMap: Record<string, string> = {
  co: "Colorado", colorado: "Colorado",
  ca: "California", california: "California",
  tx: "Texas", texas: "Texas",
  ny: "New York", "new york": "New York", "new-york": "New York",
  fl: "Florida", florida: "Florida",
  ga: "Georgia", georgia: "Georgia",
  il: "Illinois", illinois: "Illinois",
  va: "Virginia", virginia: "Virginia",
  az: "Arizona", arizona: "Arizona",
};

const formatDisplayName = (slug: string) => {
  const normalized = slug.toLowerCase();
  if (stateNameMap[normalized]) return stateNameMap[normalized];
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

interface BowlingWithFriendsPageProps { state?: string; city?: string; }

export default function BowlingWithFriends({ state: propState, city: propCity }: BowlingWithFriendsPageProps = {}) {
  const cityHubMap = useCityHubMap();
  const [cityMatch, cityParams] = useRoute("/bowling-with-friends/:state/:city");
  const [stateMatch, stateParams] = useRoute("/bowling-with-friends/:state");
  const [, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let title: string, description: string;

    if (displayCity && displayState) {
      title = `Bowling with Friends in ${displayCity}, ${displayState} | Group Lanes & Fun`;
      description = `Find the best bowling alleys for groups in ${displayCity}. Compare lane reservations, pricing, and amenities — perfect for a night out with friends.`;
    } else if (displayState) {
      title = `Bowling with Friends in ${displayState} | Group Bowling Alleys`;
      description = `Find bowling alleys across ${displayState} perfect for groups. Browse by city, check lane availability, and plan your next outing with friends.`;
    } else {
      title = "Bowling with Friends Near You | Group Bowling Alleys";
      description = "Find the best bowling alleys for groups across the U.S. Plan your next outing with friends — compare lanes, pricing, food, and more.";
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
  }, [displayState, displayCity]);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["/api/bowling-with-friends-states"],
    queryFn: getBowlingWithFriendsStates,
  });

  const { data: stateVenues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/bowling-with-friends-venues", selectedState],
    queryFn: () => selectedState ? getBowlingWithFriendsVenuesByState(displayState!) : Promise.resolve([]),
    enabled: !!selectedState,
  });

  const venuesByCity = useMemo(() => {
    if (!selectedState || !stateVenues.length) return {};
    const grouped: Record<string, Venue[]> = {};
    stateVenues.forEach((venue) => {
      const city = venue.city || "Unknown City";
      if (!grouped[city]) grouped[city] = [];
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
      .map(([city, venues]) => ({ name: city, venueCount: venues.length, slug: createSlug(city) }))
      .sort((a, b) => b.venueCount - a.venueCount);
  }, [venuesByCity, selectedState, selectedCity]);

  const filteredVenuesByCity = useMemo(() => {
    if (!selectedCity || !displayCity) return {};
    const cityVenues = venuesByCity[displayCity] || [];
    const result: Record<string, Venue[]> = { [displayCity]: cityVenues };

    if (cityVenues.length < 20) {
      const needed = 20 - cityVenues.length;
      const nearby: Venue[] = [];
      Object.entries(venuesByCity).forEach(([city, venues]) => {
        if (city !== displayCity) nearby.push(...venues);
      });
      nearby.sort((a, b) => b.avgRating - a.avgRating);
      nearby.slice(0, needed).forEach((venue) => {
        const city = venue.city || "Unknown City";
        if (!result[city]) result[city] = [];
        result[city].push(venue);
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const filtered: Record<string, Venue[]> = {};
      Object.entries(result).forEach(([city, venues]) => {
        const matches = venues.filter((v) =>
          v.name.toLowerCase().includes(lower) ||
          v.address.toLowerCase().includes(lower) ||
          v.description?.toLowerCase().includes(lower)
        );
        if (matches.length > 0) filtered[city] = matches;
      });
      return filtered;
    }

    return result;
  }, [venuesByCity, displayCity, searchTerm, selectedCity]);

  const totalVenues = selectedCity
    ? Object.values(filteredVenuesByCity).reduce((t, v) => t + v.length, 0)
    : stateVenues.length;

  const router = useRouter();
  const handleVenueClick = (venueId: string) => {
    if (typeof window !== "undefined") sessionStorage.setItem("venueBackPath", window.location.pathname);
    const venue = stateVenues.find((v) => v.id === venueId);
    trackEvent("bowling_with_friends_venue_click", "navigation", venue?.name || venueId);
    router.push(`/venue/${venueId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        {!selectedState ? (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Find Bowling Alleys for a Group Night Out
            </h1>
            <p className="text-muted-foreground text-lg">
              Planning a night out with friends? Browse bowling alleys by state — compare lane availability, food options, bars, and group pricing. Select a state to get started.
            </p>
          </>
        ) : displayCity ? (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link href="/bowling-with-friends" className="text-primary hover:text-primary/80 underline">
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href={`/bowling-with-friends/${selectedState}`} className="text-primary hover:text-primary/80 underline">
                {displayState}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{displayCity}</span>
            </nav>
            <Button variant="ghost" onClick={() => setLocation(`/bowling-with-friends/${selectedState}`)} className="text-primary hover:text-primary/80 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {displayState}
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Bowling with Friends in {displayCity}, {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {(() => {
                const cityCount = venuesByCity[displayCity!]?.length || 0;
                const nearby = totalVenues - cityCount;
                if (nearby > 0) return `${cityCount} ${cityCount === 1 ? "alley" : "alleys"} in ${displayCity} + ${nearby} nearby`;
                return `${totalVenues} bowling ${totalVenues === 1 ? "alley" : "alleys"} in ${displayCity}`;
              })()}
            </p>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-2 mb-4 text-sm">
              <Link href="/bowling-with-friends" className="text-primary hover:text-primary/80 underline">
                All States
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{displayState}</span>
            </nav>
            <Button variant="ghost" onClick={() => setLocation("/bowling-with-friends")} className="text-primary hover:text-primary/80 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All States
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Bowling with Friends in {displayState}
            </h1>
            <p className="text-muted-foreground text-lg">
              {stateVenues.length} bowling {stateVenues.length === 1 ? "alley" : "alleys"} across {citiesInState.length} {citiesInState.length === 1 ? "city" : "cities"}. Select a city to find the best spot for your group.
            </p>
          </>
        )}
      </div>

      {/* City Hub Banner */}
      {selectedCity && displayCity && cityHubMap[displayCity.toLowerCase().trim()] && (
        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <AlertDescription className="text-sm">
            Want the full guide to bowling in {displayCity}?{" "}
            <NextLink
              href={cityHubMap[displayCity.toLowerCase().trim()]}
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
            >
              Check the city guide here
            </NextLink>
          </AlertDescription>
        </Alert>
      )}

      {/* Map */}
      {selectedCity && displayCity && Object.keys(filteredVenuesByCity).length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Map View</h2>
          <CityMap venues={Object.values(filteredVenuesByCity).flat()} onVenueClick={handleVenueClick} />
        </div>
      )}

      {/* Search */}
      {selectedCity && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search bowling alleys in ${displayCity}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0">
                ×
              </Button>
            )}
          </div>
        </div>
      )}

      {!selectedState ? (
        <StateSelector
          states={states}
          isLoading={statesLoading}
          onStateClick={(state) => {
            trackEvent("bowling_with_friends_state_click", "navigation", state);
            setLocation(`/bowling-with-friends/${state.replace(/\s+/g, "-")}`);
          }}
          icon="🎳"
          testIdPrefix="bwf-state"
          description="Click to browse bowling alleys"
          emptyStateTitle="No bowling alleys found"
          emptyStateMessage="We're still building our database."
          emptyStateIcon="🎳"
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
                  trackEvent("bowling_with_friends_city_click", "navigation", `${city.name}, ${displayState}`);
                  setLocation(`/bowling-with-friends/${selectedState}/${city.slug}`);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{city.name}</h3>
                        {cityHubMap[city.name?.toLowerCase().trim() ?? ""] && (
                          <NextLink
                            href={cityHubMap[city.name?.toLowerCase().trim() ?? ""]}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs cursor-pointer hover-elevate">
                              📍 City Guide
                            </Badge>
                          </NextLink>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Click to browse alleys</p>
                      <p className="text-xs text-muted-foreground mt-1">{city.venueCount} {city.venueCount === 1 ? "venue" : "venues"}</p>
                    </div>
                    <div className="text-2xl">🎳</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎳</div>
            <h3 className="text-lg font-semibold mb-2">No bowling alleys found in {displayState}</h3>
            <p className="text-muted-foreground">Try browsing another state.</p>
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
          <div className="text-6xl mb-4">🎳</div>
          <h3 className="text-lg font-semibold mb-2">No venues found</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No results for "${searchTerm}" in ${displayCity}, ${displayState}.`
              : `No bowling alleys found in ${displayCity}, ${displayState}.`}
          </p>
        </div>
      )}
    </div>
  );
}
