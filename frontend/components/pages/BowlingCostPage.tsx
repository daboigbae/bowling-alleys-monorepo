import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ArrowLeft, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StateSelector from "@/components/StateSelector";
import CityMap from "@/components/CityMap";
import VenueCard from "@/components/VenueCard";
import { getCityHubUrl, hasCityHub } from "@/lib/cityHubMap";
import {
  getUSAPricing,
  getStatePricing,
  getCityPricing,
  getPricingStates,
  getPricingCitiesByState,
  getVenuesByStateAndCity,
  getPricingExtremes,
  PricingReport,
  PricingExtremes,
  Venue,
} from "@/lib/firestore";
import { trackEvent } from "@/lib/analytics";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";

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

// Helper function to format display name
const formatDisplayName = (slug: string) => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Format currency
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "N/A";
  return `$${amount.toFixed(2)}`;
};

interface BowlingCostPageProps { state?: string; city?: string; }
export default function BowlingCost({ state: propState, city: propCity }: BowlingCostPageProps = {}) {
  const [cityMatch, cityParams] = useRoute("/bowling-cost/:state/:city");
  const [stateMatch, stateParams] = useRoute("/bowling-cost/:state");
  const [baseMatch] = useRoute("/bowling-cost");
  const [location, setLocation] = useLocation();

  const selectedState = propState ?? (cityMatch ? decodeURIComponent(cityParams!.state) : stateMatch ? decodeURIComponent(stateParams!.state) : null);
  const selectedCity = propCity ?? (cityMatch ? decodeURIComponent(cityParams!.city) : null);

  const displayState = selectedState?.toUpperCase();
  const displayCity = selectedCity ? formatDisplayName(selectedCity) : null;

  // Set page title and meta description
  useEffect(() => {
    let title, description;

    if (displayCity && displayState) {
      title = `Bowling Costs in ${displayCity}, ${displayState} | Average Bowling Prices`;
      description = `Find average bowling costs in ${displayCity}, ${displayState}. See pricing for games, hourly rates, and shoe rentals at local bowling alleys.`;
    } else if (displayState) {
      title = `Bowling Costs in ${displayState} | Bowling Alley Prices by City`;
      description = `Browse bowling costs across ${displayState}. Compare average prices for games, hourly rates, and shoe rentals in cities throughout the state.`;
    } else {
      title = "Bowling Costs & Prices | Average Bowling Alley Costs by State";
      description =
        "Discover average bowling costs across the United States. Find pricing information for games, hourly rates, and shoe rentals at bowling alleys in your state and city.";
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
  }, [displayCity, displayState]);

  // Fetch USA pricing data
  const { data: usaPricing, isLoading: usaLoading } = useQuery<PricingReport | null>({
    queryKey: ["/api/pricing/usa"],
    queryFn: getUSAPricing,
    enabled: !selectedState,
  });

  // Fetch state pricing data
  const { data: statePricing, isLoading: stateLoading } = useQuery<PricingReport | null>({
    queryKey: ["/api/pricing/state", selectedState],
    queryFn: () => getStatePricing(selectedState!),
    enabled: !!selectedState && !selectedCity,
  });

  // Fetch city pricing data
  const { data: cityPricing, isLoading: cityLoading } = useQuery<PricingReport | null>({
    queryKey: ["/api/pricing/city", selectedState, selectedCity],
    queryFn: () => getCityPricing(selectedCity!, selectedState!),
    enabled: !!selectedState && !!selectedCity,
  });

  // Fetch available states
  const { data: states = [], isLoading: statesLoading } = useQuery<string[]>({
    queryKey: ["/api/pricing/states"],
    queryFn: getPricingStates,
    enabled: !selectedState,
  });

  // Fetch cities for selected state
  const { data: cities = [], isLoading: citiesLoading } = useQuery<string[]>({
    queryKey: ["/api/pricing/cities", selectedState],
    queryFn: () => getPricingCitiesByState(selectedState!),
    enabled: !!selectedState && !selectedCity,
  });

  // Fetch bowling alleys for selected city
  const { data: cityVenues = [], isLoading: cityVenuesLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues/city", selectedState, selectedCity],
    queryFn: () => getVenuesByStateAndCity(selectedState!, displayCity!),
    enabled: !!selectedState && !!selectedCity,
  });

  // Fetch pricing extremes (cheapest/most expensive cities)
  const { data: pricingExtremes } = useQuery<PricingExtremes>({
    queryKey: ["/api/pricing/extremes"],
    queryFn: getPricingExtremes,
    enabled: !selectedState,
  });

  const handleStateClick = (state: string) => {
    const stateSlug = state.replace(/\s+/g, "-");
    setLocation(`/bowling-cost/${stateSlug}`);
    trackEvent("cost_state_click", "navigation", state);
  };

  const handleCityClick = (city: string) => {
    const citySlug = createSlug(city);
    const stateSlug = selectedState!.replace(/\s+/g, "-");
    setLocation(`/bowling-cost/${stateSlug}/${citySlug}`);
    trackEvent("cost_city_click", "navigation", `${city}, ${selectedState}`);
  };

  const handleBackToStates = () => {
    setLocation("/bowling-cost");
  };

  const handleBackToCities = () => {
    const stateSlug = selectedState!.replace(/\s+/g, "-");
    setLocation(`/bowling-cost/${stateSlug}`);
  };

  const PricingCard = ({ report, title }: { report: PricingReport; title: string }) => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">
          Based on {report.venueCount} bowling {report.venueCount === 1 ? "alley" : "alleys"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Game</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.averageGamePrice)}</div>
            <p className="text-xs text-muted-foreground">
              {report.venuesWithGamePricing} {report.venuesWithGamePricing === 1 ? "venue" : "venues"} with pricing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hourly Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.averageHourlyPrice)}</div>
            <p className="text-xs text-muted-foreground">
              {report.venuesWithHourlyPricing} {report.venuesWithHourlyPricing === 1 ? "venue" : "venues"} with pricing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shoe Rental</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.averageShoeRentalPrice)}</div>
            <p className="text-xs text-muted-foreground">
              {report.venuesWithShoeRentalPricing} {report.venuesWithShoeRentalPricing === 1 ? "venue" : "venues"} with pricing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* USA Level */}
        {!selectedState && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">
                Bowling Costs & Prices Across the USA
              </h1>
              <p className="text-lg text-muted-foreground">
                Find average bowling costs and pricing information for bowling alleys across the United States
              </p>
            </div>

            {usaLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading pricing data...</p>
              </div>
            ) : usaPricing ? (
              <>
                <PricingCard report={usaPricing} title="USA Average Bowling Costs" />

                {/* Report metadata */}
                {pricingExtremes?.reportDate && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Report generated {new Date(pricingExtremes.reportDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                )}

                {/* Pricing extremes - Per Game */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Per Game Pricing</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pricingExtremes?.cheapestByGame && (
                      <Card className="border-green-200 dark:border-green-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Cheapest State</CardTitle>
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <Link 
                            href={`/bowling-cost/${pricingExtremes.cheapestByGame.state.toLowerCase()}`} 
                            className="hover:underline"
                          >
                            <div className="text-lg font-semibold text-green-600">
                              {pricingExtremes.cheapestByGame.state}
                            </div>
                          </Link>
                          <p className="text-sm font-medium mt-1">
                            {formatCurrency(pricingExtremes.cheapestByGame.gamePrice)}/game
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {pricingExtremes?.mostExpensiveByGame && (
                      <Card className="border-red-200 dark:border-red-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Most Expensive State</CardTitle>
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <Link 
                            href={`/bowling-cost/${pricingExtremes.mostExpensiveByGame.state.toLowerCase()}`} 
                            className="hover:underline"
                          >
                            <div className="text-lg font-semibold text-red-600">
                              {pricingExtremes.mostExpensiveByGame.state}
                            </div>
                          </Link>
                          <p className="text-sm font-medium mt-1">
                            {formatCurrency(pricingExtremes.mostExpensiveByGame.gamePrice)}/game
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Pricing extremes - Per Hour */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Hourly Pricing</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pricingExtremes?.cheapestByHour && (
                      <Card className="border-green-200 dark:border-green-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Cheapest State</CardTitle>
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <Link 
                            href={`/bowling-cost/${pricingExtremes.cheapestByHour.state.toLowerCase()}`} 
                            className="hover:underline"
                          >
                            <div className="text-lg font-semibold text-green-600">
                              {pricingExtremes.cheapestByHour.state}
                            </div>
                          </Link>
                          <p className="text-sm font-medium mt-1">
                            {formatCurrency(pricingExtremes.cheapestByHour.hourlyPrice)}/hour
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {pricingExtremes?.mostExpensiveByHour && (
                      <Card className="border-red-200 dark:border-red-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Most Expensive State</CardTitle>
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <Link 
                            href={`/bowling-cost/${pricingExtremes.mostExpensiveByHour.state.toLowerCase()}`} 
                            className="hover:underline"
                          >
                            <div className="text-lg font-semibold text-red-600">
                              {pricingExtremes.mostExpensiveByHour.state}
                            </div>
                          </Link>
                          <p className="text-sm font-medium mt-1">
                            {formatCurrency(pricingExtremes.mostExpensiveByHour.hourlyPrice)}/hour
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Featured Bowling Alleys */}
                <RelatedBlogPosts 
                  maxResults={9} 
                  title="Featured Bowling Alleys" 
                />

                <div className="mt-12">
                  <h2 className="text-2xl font-bold mb-6">Browse Bowling Costs by State</h2>
                  <StateSelector
                    states={states}
                    isLoading={statesLoading}
                    onStateClick={handleStateClick}
                    emptyStateMessage="No pricing data available for any states yet."
                  />
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  No pricing data available yet. Please check back later.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* State Level */}
        {selectedState && !selectedCity && (
          <>
            <Button
              variant="ghost"
              onClick={handleBackToStates}
              className="mb-6"
              data-testid="button-back-to-states"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All States
            </Button>

            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">
                Bowling Costs in {displayState}
              </h1>
              <p className="text-lg text-muted-foreground">
                Average bowling prices and costs for bowling alleys in {displayState}
              </p>
            </div>

            {/* Related Bowling Alleys Section */}
            <div className="mb-8">
              <RelatedBlogPosts 
                maxResults={9} 
                title={`Bowling Alleys in ${displayState}`} 
                filterByState={displayState} 
              />
            </div>

            {stateLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading pricing data...</p>
              </div>
            ) : statePricing ? (
              <>
                <PricingCard report={statePricing} title={`${displayState} Average Bowling Costs`} />

                <div className="mt-12">
                  <h2 className="text-2xl font-bold mb-6">
                    Browse Bowling Costs by City in {displayState}
                  </h2>
                  {citiesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading cities...</p>
                    </div>
                  ) : cities.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {cities.map((city) => (
                        <Button
                          key={city}
                          variant="outline"
                          className="justify-start h-auto py-3 px-4 hover-elevate"
                          onClick={() => handleCityClick(city)}
                          data-testid={`button-city-${createSlug(city)}`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="font-medium flex-1">{city}</span>
                            {hasCityHub(city) && (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs shrink-0"
                              >
                                📍 City Guide
                              </Badge>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No city-level pricing data available for {displayState} yet.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  No pricing data available for {displayState} yet.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* City Level */}
        {selectedState && selectedCity && (
          <>
            <Button
              variant="ghost"
              onClick={handleBackToCities}
              className="mb-6"
              data-testid="button-back-to-cities"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {displayState} Cities
            </Button>

            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">
                Bowling Costs in {displayCity}, {displayState}
              </h1>
              <p className="text-lg text-muted-foreground">
                Average bowling prices and costs for bowling alleys in {displayCity}
              </p>
            </div>

            {/* City Hub Guide Banner */}
            {displayCity && getCityHubUrl(displayCity) && (
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

            {cityLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading pricing data...</p>
              </div>
            ) : cityPricing ? (
              <PricingCard report={cityPricing} title={`${displayCity}, ${displayState} Average Bowling Costs`} />
            ) : (
              <Alert>
                <AlertDescription>
                  No pricing data available for {displayCity}, {displayState} yet.
                </AlertDescription>
              </Alert>
            )}

            {/* City Map - Only show when viewing a specific city */}
            {selectedCity && displayCity && cityVenues.length > 0 && (
              <div className="mt-12 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Map View</h2>
                <CityMap
                  venues={cityVenues}
                  onVenueClick={(venueId) => {
                    setLocation(`/venue/${venueId}`);
                  }}
                />
              </div>
            )}

            {/* Bowling Alleys List - Always show if we have city/state */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">
                Bowling Alleys in {displayCity}, {displayState}
              </h2>
              {cityVenuesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading bowling alleys...</p>
                </div>
              ) : cityVenues.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {cityVenues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onViewDetails={(venueId) => setLocation(`/venue/${venueId}`)}
                      showRating={true}
                      showPrice={true}
                    />
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No bowling alleys found in {displayCity}, {displayState}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </main>

    </div>
  );
}
