'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Venue } from "@/lib/firestore";
import { Sparkles, Trophy, PartyPopper, MapPin, Accessibility, Beer, Star } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface VenueCardProps {
  venue: Venue;
  onViewDetails: (venueId: string) => void;
  showRating?: boolean;
  showPrice?: boolean;
  priceType?: "hourly" | "game";
}

export default function VenueCard({
  venue,
  onViewDetails,
  showRating: _showRating = false,
  showPrice = false,
  priceType,
}: VenueCardProps) {
  // Array of stock images to use as thumbnails fallback
  const thumbnailImages = [
    "/attached_assets/stock_images/modern_bowling_alley_858f3be7.jpg",
    "/attached_assets/stock_images/modern_bowling_alley_0b9b2d1f.jpg",
    "/attached_assets/stock_images/modern_bowling_alley_4d2a703b.jpg",
    "/attached_assets/stock_images/modern_bowling_alley_4a4e0ef5.jpg",
    "/attached_assets/stock_images/modern_bowling_alley_8e0262a0.jpg",
  ];

  // Use cover photo if available, otherwise fallback to stock images
  const thumbnailSrc = venue.coverImageUrl
    ? venue.coverImageUrl
    : (() => {
        // Select stock image based on a simple hash of venue ID for consistency
        const imageIndex =
          venue.id
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
          thumbnailImages.length;
        return thumbnailImages[imageIndex];
      })();

  // Handle missing city/state gracefully for location pill
  const hasLocation = venue.city && venue.state;
  const locationPillText = hasLocation ? `${venue.city}, ${venue.state}` : "";

  // Check amenities
  const hasParties = venue.amenities?.includes("Parties");
  const hasBar = venue.amenities?.includes("Bar");
  const hasCosmicBowling = venue.amenities?.some(
    (amenity) => amenity === "Cosmic Bowling" || amenity === "Glow Bowling",
  );
  const hasLeagues =
    venue.amenities?.includes("🏆 Leagues") ||
    venue.amenities?.includes("Leagues");
  const hasWheelchairAccessible = venue.amenities?.includes("Wheelchair Accessible");

  return (
    <Card
      className="bg-white dark:bg-neutral-900 shadow-sm rounded-xl hover-elevate cursor-pointer transition-all duration-200 border-l-4 hover:shadow-md dark:hover:bg-neutral-800"
      style={{ borderLeftColor: '#d52231', borderColor: '#0d3149', backgroundColor: '#ffffff' }}
      data-testid={`card-venue-${venue.id}`}
      onClick={() => onViewDetails(venue.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails(venue.id);
        }
      }}
    >
      <div className="p-6 flex gap-4">
        {/* Thumbnail Image */}
        <div className="flex-shrink-0">
          <Image
            src={thumbnailSrc}
            alt={`${venue.name} bowling alley`}
            width={80}
            height={80}
            className="w-20 h-20 object-cover rounded-lg ring-2 ring-[#0d3149]/20"
            loading="lazy"
            onError={(e) => {
              // Fallback to stock image if cover photo fails to load
              if (
                venue.coverImageUrl &&
                e.currentTarget.src === venue.coverImageUrl
              ) {
                const imageIndex =
                  venue.id
                    .split("")
                    .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
                  thumbnailImages.length;
                e.currentTarget.src = thumbnailImages[imageIndex];
              }
            }}
            data-testid={`img-venue-thumbnail-${venue.id}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name - Full width */}
          <h3
            className="text-lg font-semibold mb-1 line-clamp-2 font-subtitle text-[#0d3149] dark:text-white"
            style={{ color: '#0d3149' }}
            data-testid={`text-venue-name-${venue.id}`}
          >
            {venue.name}
          </h3>

          {/* Last Updated */}
          {venue.updatedAt && (() => {
            try {
              let date: Date;
              if (venue.updatedAt.toDate) {
                // Firestore Timestamp
                date = venue.updatedAt.toDate();
              } else if (venue.updatedAt._seconds) {
                // Admin SDK format (with underscore)
                date = new Date(venue.updatedAt._seconds * 1000);
              } else if (venue.updatedAt.seconds) {
                // Client SDK format
                date = new Date(venue.updatedAt.seconds * 1000);
              } else {
                date = new Date(venue.updatedAt);
              }
              if (isNaN(date.getTime())) return null;
              return (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2" data-testid={`text-venue-updated-${venue.id}`}>
                  Updated {formatDistanceToNow(date, { addSuffix: false })} ago
                </p>
              );
            } catch {
              return null;
            }
          })()}

          {/* Price and Lanes Badges */}
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Price Badge */}
            {(() => {
              const hourly = venue.pricing?.hourly;
              const game = venue.pricing?.game;
              const numHourly = hourly == null ? NaN : parseFloat(String(hourly));
              const numGame = game == null ? NaN : parseFloat(String(game));

              let price: number | null = null;
              let unit: "/hr" | "/game" | null = null;

              // If priceType is specified, only show that type
              if (priceType === "hourly") {
                if (!Number.isNaN(numHourly) && numHourly > 0) {
                  price = numHourly;
                  unit = "/hr";
                }
              } else if (priceType === "game") {
                if (!Number.isNaN(numGame) && numGame > 0) {
                  price = numGame;
                  unit = "/game";
                }
              } else {
                // Default behavior: show hourly if available, otherwise game
                if (!Number.isNaN(numHourly) && numHourly > 0) {
                  price = numHourly;
                  unit = "/hr";
                } else if (!Number.isNaN(numGame) && numGame > 0) {
                  price = numGame;
                  unit = "/game";
                }
              }

              if (price == null || unit == null) return null;

              return (
                <Badge
                  variant="default"
                  className="rounded-full text-white"
                  style={{ backgroundColor: '#d52231' }}
                  data-testid={`badge-venue-price-${venue.id}`}
                >
                  Peak ~${Math.round(price)}{unit}
                </Badge>
              );
            })()}

            {/* Specials Badge - only show if specialsUrl exists */}
            {venue.specialsUrl && (
              <Badge
                variant="default"
                className="rounded-full text-white"
                style={{ backgroundColor: '#8d1914' }}
                data-testid={`badge-venue-specials-${venue.id}`}
              >
                Specials
              </Badge>
            )}
          </div>

          {/* Amenities Row - Icon badges */}
          {(hasParties || hasBar || hasCosmicBowling || hasLeagues || hasWheelchairAccessible) && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {hasParties && (
                <Badge
                  variant="outline"
                  className="rounded-full flex items-center gap-1 border-2 border-gray-300 dark:border-neutral-400"
                  style={{ color: '#0d3149', borderColor: '#d1d5db' }}
                  data-testid={`badge-venue-parties-${venue.id}`}
                >
                  <PartyPopper className="w-3 h-3" style={{ color: '#0d3149' }} />
                  Parties
                </Badge>
              )}
              {hasBar && (
                <Badge
                  variant="outline"
                  className="rounded-full flex items-center gap-1 border-2 border-gray-300 dark:border-neutral-400"
                  style={{ color: '#0d3149', borderColor: '#d1d5db' }}
                  data-testid={`badge-venue-bar-${venue.id}`}
                >
                  <Beer className="w-3 h-3" style={{ color: '#0d3149' }} />
                  Bar
                </Badge>
              )}
              {hasCosmicBowling && (
                <Badge
                  variant="outline"
                  className="rounded-full flex items-center gap-1 border-2 border-gray-300 dark:border-neutral-400"
                  style={{ color: '#0d3149', borderColor: '#d1d5db' }}
                  data-testid={`badge-venue-cosmic-${venue.id}`}
                >
                  <Sparkles className="w-3 h-3" style={{ color: '#0d3149' }} />
                  Cosmic
                </Badge>
              )}
              {hasLeagues && (
                <Badge
                  variant="outline"
                  className="rounded-full flex items-center gap-1 border-2 border-gray-300 dark:border-neutral-400"
                  style={{ color: '#0d3149', borderColor: '#d1d5db' }}
                  data-testid={`badge-venue-leagues-${venue.id}`}
                >
                  <Trophy className="w-3 h-3" style={{ color: '#0d3149' }} />
                  Leagues
                </Badge>
              )}
              {hasWheelchairAccessible && (
                <Badge
                  variant="outline"
                  className="rounded-full flex items-center gap-1 border-2 border-gray-300 dark:border-neutral-400"
                  style={{ color: '#0d3149', borderColor: '#d1d5db' }}
                  data-testid={`badge-venue-wheelchair-${venue.id}`}
                >
                  <Accessibility className="w-3 h-3" style={{ color: '#0d3149' }} />
                  Accessible
                </Badge>
              )}
            </div>
          )}

          {/* Location and Rating Row */}
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {hasLocation && (
              <div className="flex items-center gap-1 text-sm text-[#0d3149] dark:text-neutral-300" style={{ color: '#0d3149' }}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0d3149' }} />
                <span data-testid={`text-venue-location-${venue.id}`}>
                  {venue.city}, {venue.state}
                </span>
              </div>
            )}
            {(() => {
              const rating = venue.googleRating ?? venue.avgRating;
              const count = venue.googleUserRatingCount ?? venue.reviewCount;
              const hasRating = typeof rating === "number" && rating > 0;
              const hasCount = typeof count === "number" && count > 0;
              if (!hasRating && !hasCount) return null;
              return (
                <div
                  className="flex items-center gap-1.5 text-sm text-[#0d3149] dark:text-neutral-300"
                  style={{ color: '#0d3149' }}
                  data-testid={`text-venue-rating-${venue.id}`}
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                  <span>{hasRating ? Number(rating).toFixed(1) : "—"}</span>
                  {hasCount && (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      ({Number(count).toLocaleString()} review{Number(count) !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Address */}
          <p
            className="text-sm text-[#0d3149] dark:text-neutral-400"
            style={{ color: '#0d3149' }}
            data-testid={`text-venue-address-${venue.id}`}
          >
            {venue.address}
            {venue.city && venue.state ? `, ${venue.city}, ${venue.state}` : ""}
            {venue.zipCode ? ` ${venue.zipCode}` : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}


