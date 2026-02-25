'use client';

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import VenueCard from "@/components/VenueCard";
import { getVenues, Venue } from "@/lib/firestore";
import { useGeolocation, calculateDistance } from "@/lib/geolocation";
import { trackEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";

interface BlogVenuesProps {
  maxResults?: number;
  title?: string;
  filterByLeaguesUrl?: boolean;
  filterBySpecialsUrl?: boolean;
  filterBySeniorDiscount?: boolean;
  filterByState?: string;
  excludeVenueId?: string;
}

export default function RelatedBlogPosts({
  maxResults = 9,
  title = "Bowling Alleys to Explore",
  filterByLeaguesUrl = false,
  filterBySpecialsUrl = false,
  filterBySeniorDiscount = false,
  filterByState,
  excludeVenueId,
}: BlogVenuesProps) {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [allVenuesCache, setAllVenuesCache] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const { latitude, longitude, loading: locationLoading, requestLocation } = useGeolocation();
  
  // Auto-enable location mode if user already has location available
  const [useLocationMode, setUseLocationMode] = useState(false);
  
  useEffect(() => {
    if (latitude && longitude && !useLocationMode) {
      setUseLocationMode(true);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        let allVenues = await getVenues();
        
        // Filter by leaguesUrl if requested
        if (filterByLeaguesUrl) {
          allVenues = allVenues.filter((v: any) => v.leaguesUrl);
        }
        
        // Filter by specialsUrl if requested
        if (filterBySpecialsUrl) {
          allVenues = allVenues.filter((v: any) => v.specialsUrl);
        }
        
        // Filter by senior discount amenity if requested
        if (filterBySeniorDiscount) {
          allVenues = allVenues.filter((v: any) => 
            v.amenities && v.amenities.includes("Seniors / 55+")
          );
        }
        
        // Filter by state if requested
        if (filterByState) {
          allVenues = allVenues.filter((v: any) => 
            v.state?.toLowerCase() === filterByState.toLowerCase()
          );
        }
        
        if (excludeVenueId) {
          allVenues = allVenues.filter((v: any) => v.id !== excludeVenueId);
        }
        
        setAllVenuesCache(allVenues);
        
        if (useLocationMode && latitude && longitude) {
          const venuesWithDistance = allVenues
            .filter(v => v.location?.latitude && v.location?.longitude)
            .map(venue => ({
              ...venue,
              distance: calculateDistance(
                latitude,
                longitude,
                venue.location!.latitude,
                venue.location!.longitude
              )
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxResults);
          
          setVenues(venuesWithDistance);
        } else {
          const shuffled = [...allVenues].sort(() => Math.random() - 0.5);
          const randomVenues = shuffled.slice(0, maxResults);
          setVenues(randomVenues);
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [maxResults, filterByLeaguesUrl, filterBySpecialsUrl, filterByState, excludeVenueId]);

  useEffect(() => {
    // Don't apply location-based sorting when filtering by state
    if (useLocationMode && latitude && longitude && allVenuesCache.length > 0 && !filterByState) {
      const venuesWithDistance = allVenuesCache
        .filter(v => v.location?.latitude && v.location?.longitude)
        .map(venue => ({
          ...venue,
          distance: calculateDistance(
            latitude,
            longitude,
            venue.location!.latitude,
            venue.location!.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults);
      
      setVenues(venuesWithDistance);
    }
  }, [useLocationMode, latitude, longitude, allVenuesCache, maxResults, filterByState]);

  const handleEnableLocation = () => {
    trackEvent("find_alleys_near_me_click", "Location", "Enable location button");
    setUseLocationMode(true);
    requestLocation();
  };

  // When filtering by state, don't use location features
  const isUsingLocation = useLocationMode && latitude && longitude && !filterByState;
  const showLocationButton = !filterByState;

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-foreground mb-8">{title}</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading venues...</div>
        </div>
      </div>
    );
  }

  if (venues.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2
            className="text-2xl font-bold text-foreground"
            data-testid="heading-people-also-viewed-blog"
          >
            {isUsingLocation ? (filterByLeaguesUrl ? "Bowling Leagues Near You" : "Bowling Alleys Near You") : title}
          </h2>
          {showLocationButton && (
            isUsingLocation ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Based on your location
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableLocation}
                disabled={locationLoading}
                className="text-sm"
                data-testid="button-enable-location"
              >
                <Navigation className="w-3 h-3 mr-1" />
                {locationLoading ? "Finding you..." : (filterByLeaguesUrl ? "Find leagues near me" : "Find alleys near me")}
              </Button>
            )
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const container = document.getElementById(
                "blog-venues-scroll-container"
              );
              if (container) {
                container.scrollBy({ left: -320, behavior: "smooth" });
              }
            }}
            data-testid="button-scroll-left-blog-venues"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const container = document.getElementById(
                "blog-venues-scroll-container"
              );
              if (container) {
                container.scrollBy({ left: 320, behavior: "smooth" });
              }
            }}
            data-testid="button-scroll-right-blog-venues"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <div
          id="blog-venues-scroll-container"
          className="flex overflow-x-auto space-x-6 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="flex-none w-96"
              data-testid={`blog-venue-card-${venue.id}`}
            >
              <VenueCard
                venue={venue}
                onViewDetails={(venueId) => {
                  router.push(`/venue/${venueId}`);
                }}
                showRating={true}
                showPrice={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
