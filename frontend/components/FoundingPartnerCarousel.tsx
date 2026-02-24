'use client';

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Crown, MapPin, ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFeaturedVenues } from "@/lib/firestore";

interface FoundingPartnerCarouselProps {
  amenityFilter?: string;
  autoplayDelay?: number;
  className?: string;
  title?: string;
}

export function FoundingPartnerCarousel({
  amenityFilter,
  autoplayDelay = 5000,
  className = "",
  title,
}: FoundingPartnerCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const { data: venues, isLoading } = useQuery({
    queryKey: ["/api/featured-venues", amenityFilter],
    queryFn: async () => {
      const allFeaturedVenues = await getFeaturedVenues();

      if (!amenityFilter) {
        return allFeaturedVenues;
      }

      return allFeaturedVenues.filter((venue) =>
        venue.amenities?.some(
          (amenity) =>
            amenity.toLowerCase().includes(amenityFilter.toLowerCase()) ||
            amenity
              .toLowerCase()
              .replace(/[^\w\s]/g, "")
              .includes(amenityFilter.toLowerCase()),
        ),
      );
    },
  });

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!api || !venues || venues.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      api.scrollNext();
    }, autoplayDelay);

    return () => clearInterval(interval);
  }, [api, autoplayDelay, venues]);

  if (isLoading) {
    return (
      <div
        className={`relative w-full h-[500px] bg-muted animate-pulse rounded-lg ${className}`}
        data-testid="carousel-loading"
      />
    );
  }

  if (!venues || venues.length === 0) {
    return null;
  }

  const displayTitle = title || (amenityFilter 
    ? `Featured Founding Partners with ${amenityFilter}` 
    : "Featured Founding Partners");

  return (
    <div className="mb-12" data-testid="section-founding-partner-carousel">
      <h2 className="text-2xl font-bold mb-6">{displayTitle}</h2>
      <div
        className={`relative w-full ${className}`}
        data-testid="carousel-founding-partners"
      >
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {venues.map((venue) => {
            const imageUrl =
              venue.imageUrls && venue.imageUrls.length > 0
                ? venue.imageUrls[0]
                : venue.coverImageUrl;

            return (
              <CarouselItem
                key={venue.id}
                data-testid={`carousel-item-${venue.id}`}
              >
                <div className="relative w-full h-[500px] overflow-hidden rounded-lg">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={venue.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 80vw"
                      className="object-cover"
                      data-testid={`carousel-image-${venue.id}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="flex items-center gap-2 mb-3">
                      {venue.isSponsor && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-600/90 text-white border-none hover:bg-emerald-600"
                          data-testid={`badge-sponsor-${venue.id}`}
                        >
                          Sponsor
                        </Badge>
                      )}
                      {venue.isFoundingPartner && (
                        <Badge
                          variant="secondary"
                          className="bg-purple-600/90 text-white border-none hover:bg-purple-600"
                          data-testid={`badge-founding-partner-${venue.id}`}
                        >
                          <Crown className="h-3 w-3 mr-1 fill-white" />
                          Founding Partner
                        </Badge>
                      )}
                      {venue.isTopAlley && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/90 text-white border-none hover:bg-amber-500"
                          data-testid={`badge-top-alley-${venue.id}`}
                        >
                          Top Alley
                        </Badge>
                      )}
                    </div>

                    <h2
                      className="text-3xl md:text-4xl font-bold mb-2"
                      data-testid={`text-venue-name-${venue.id}`}
                    >
                      {venue.name}
                    </h2>

                    {venue.city && venue.state && (
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-4 w-4" />
                        <span
                          className="text-lg"
                          data-testid={`text-venue-location-${venue.id}`}
                        >
                          {venue.city}, {venue.state}
                        </span>
                      </div>
                    )}

                    {venue.description && (
                      <p
                        className="text-white/90 mb-6 max-w-3xl line-clamp-2"
                        data-testid={`text-venue-description-${venue.id}`}
                      >
                        {venue.description}
                      </p>
                    )}

                    <Link href={`/venue/${venue.id}`}>
                      <Button
                        size="lg"
                        className="bg-white text-black hover:bg-white/90"
                        data-testid={`button-view-details-${venue.id}`}
                      >
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselPrevious
          className="left-4 bg-white/90 text-black hover:bg-white"
          data-testid="button-carousel-previous"
        />
        <CarouselNext
          className="right-4 bg-white/90 text-black hover:bg-white"
          data-testid="button-carousel-next"
        />
      </Carousel>

      {venues.length > 1 && (
        <div
          className="flex justify-center gap-2 mt-4"
          data-testid="carousel-indicators"
        >
          {venues.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === current
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              data-testid={`carousel-indicator-${index}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
