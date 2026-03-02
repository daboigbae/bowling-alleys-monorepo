'use client';

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { CITY_HUBS } from "@/lib/cityHubsConfig";
import { abbreviationToState } from "@/lib/firestore";

export default function CityGuidesPage() {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {CITY_HUBS.map((hub) => (
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
                        {hub.city}, {abbreviationToState[hub.state] || hub.state}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {hub.cardDesc}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                          Guide Available
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
