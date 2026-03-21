'use client';

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { getHubs, getCityFromHubTitle, abbreviationToState } from "@/lib/firestore";

export default function CityGuidesPage() {
  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ["hubs"],
    queryFn: getHubs,
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              City Guides
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore comprehensive guides for top bowling destinations across the country with detailed venue information, pricing, and local insights.
            </p>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {hubs.map((hub) => {
                const city = hub.city ?? getCityFromHubTitle(hub.title);
                const state = hub.stateCode ?? "";
                const cardDesc = hub.description || hub.subtitle || `Bowling guide for ${city}`;
                return (
                  <Link
                    key={hub.slug}
                    href={`/${hub.slug}`}
                    data-testid={`link-hub-${hub.slug}`}
                  >
                    <Card
                      className="p-6 hover-elevate active-elevate-2 transition-all cursor-pointer h-full"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">
                            {city}, {abbreviationToState[state] || state}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {cardDesc}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
