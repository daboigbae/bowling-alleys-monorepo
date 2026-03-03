'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import VenueCard from "@/components/VenueCard";
import CityMap from "@/components/CityMap";
import {
  getVenuesWithExpansion,
  getHubBySlug,
  type Venue,
} from "@/lib/firestore";
import { DollarSign, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

type FAQ = { q: string; a: string };

const VENUES_PER_PAGE = 12;

export default function CityHubPage({
  titleTag,
  metaDesc,
  h1,
  intro,
  city,
  state,
  year,
  faqs,
  stateSlug,
  slug,
}: {
  titleTag: string;
  metaDesc: string;
  h1: string;
  intro: string;
  city: string;
  state: string;
  year: string | number;
  faqs: FAQ[];
  stateSlug: string;
  slug: string;
}) {
  const router = useRouter();
  const [linkCopied, setLinkCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Fetch venues from Firestore
  const { data, isLoading } = useQuery({
    queryKey: ["venues-expanded", state, city],
    queryFn: () => getVenuesWithExpansion(state, city),
  });

  // Fetch hub data by slug
  const { data: hubData } = useQuery({
    queryKey: ["hub-by-slug", slug],
    queryFn: () => getHubBySlug(slug),
  });

  // Sort venues by rating (highest first) - matching Home page logic
  const sortedVenues = [...(data?.venues || [])].sort((a, b) => {
    return b.avgRating - a.avgRating;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedVenues.length / VENUES_PER_PAGE);
  const startIndex = (currentPage - 1) * VENUES_PER_PAGE;
  const endIndex = startIndex + VENUES_PER_PAGE;
  const paginatedVenues = sortedVenues.slice(startIndex, endIndex);

  // Reset to page 1 when venues change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortedVenues.length]);

  // Use hub description if available, otherwise fall back to prop
  const displayIntro = hubData?.description || intro;

  // Share handlers
  const handleShareFacebook = () => {
    const url = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
    trackEvent("share_facebook", "social", h1);
  };

  const handleShareTwitter = () => {
    const url = window.location.href;
    const text = `${h1} - Check out BowlingAlleys.io!`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
    trackEvent("share_twitter", "social", h1);
  };

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    const text = `${h1} - Check out BowlingAlleys.io! ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    trackEvent("share_whatsapp", "social", h1);
  };

  const handleShareSMS = () => {
    const url = window.location.href;
    const text = `${h1} - Check out BowlingAlleys.io! ${url}`;
    const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    trackEvent("share_sms", "social", h1);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      trackEvent("copy_link", "social", h1);
      toast({
        title: "Link Copied!",
        description: "Share link copied to clipboard",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to Copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    document.title = titleTag;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", metaDesc);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = metaDesc;
      document.head.appendChild(meta);
    }

    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-city-hub]',
    );
    if (existingScript) {
      existingScript.remove();
    }

    if (faqs.length > 0) {
      const faqLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      };

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-city-hub", "true");
      script.textContent = JSON.stringify(faqLd);
      document.head.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [titleTag, metaDesc, faqs]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <h1
          className="text-4xl md:text-5xl font-bold mb-3"
          data-testid="text-city-hub-title"
        >
          Things To Do in {city}, {state} ({year})
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-foreground">
          Best Bowling Alleys in {city}
        </h2>
        <p className="text-lg text-muted-foreground mb-6">{displayIntro}</p>

        {/* Share Buttons */}
        <div className="flex gap-2 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handleShareFacebook}
            data-testid="button-share-facebook"
            title="Share on Facebook"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShareTwitter}
            data-testid="button-share-twitter"
            title="Share on Twitter"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShareWhatsApp}
            data-testid="button-share-whatsapp"
            title="Share on WhatsApp"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShareSMS}
            data-testid="button-share-sms"
            title="Share via SMS"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyLink}
            data-testid="button-copy-link"
            title="Copy link"
          >
            {linkCopied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Map Section */}
        {sortedVenues.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Map View</h2>
            <CityMap
              venues={sortedVenues}
              onVenueClick={(venueId) => {
                router.push(`/venue/${venueId}`);
              }}
            />
          </section>
        )}

        {/* Tonight's Pricing Section */}
        <section className="mb-12">
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">Bowling Costs</h2>
                <p className="text-muted-foreground mb-4">
                  Compare bowling costs across the US. See hourly rates,
                  per-game pricing, and shoe rental costs.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="default"
                    onClick={() => router.push("/bowling-cost")}
                    data-testid="button-all-pricing"
                  >
                    All US Pricing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/bowling-cost/${stateSlug.toLowerCase()}`)
                    }
                    data-testid="button-state-pricing"
                  >
                    {state} Pricing
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Venues Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              Bowling Alleys in {city}, {state}
            </h2>
            <div className="text-sm text-muted-foreground">
              {sortedVenues.length} {sortedVenues.length === 1 ? 'alley' : 'alleys'} • Sorted by rating
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {paginatedVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onViewDetails={(venueId) => {
                  router.push(`/venue/${venueId}`);
                }}
                showRating={true}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    Math.abs(page - currentPage) <= 1;
                  
                  const showEllipsis = 
                    (page === 2 && currentPage > 3) ||
                    (page === totalPages - 1 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return (
                      <span key={page} className="text-muted-foreground px-2">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                      className="min-w-9"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </section>

        {faqs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <Card key={i} className="p-6" data-testid={`card-faq-${i}`}>
                  <details className="cursor-pointer">
                    <summary className="font-semibold text-lg">{f.q}</summary>
                    <p className="mt-3 text-muted-foreground">{f.a}</p>
                  </details>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Footer Navigation Section */}
        <section className="mb-12 bg-muted/30 p-8 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Bowling Alleys Column */}
            <div>
              <h3 className="font-semibold mb-3">Bowling Alleys</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/locations"
                    className="text-muted-foreground hover:text-primary"
                  >
                    All Bowling Alleys
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/locations/${stateSlug.toLowerCase()}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Bowling Alleys in {state}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Bowling Leagues Column */}
            <div>
              <h3 className="font-semibold mb-3">Bowling Leagues</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/bowling-league"
                    className="text-muted-foreground hover:text-primary"
                  >
                    All Bowling Leagues
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/bowling-league/${stateSlug.toLowerCase()}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Bowling Leagues in {state}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Bowling Costs Column */}
            <div>
              <h3 className="font-semibold mb-3">Bowling Costs</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/bowling-cost"
                    className="text-muted-foreground hover:text-primary"
                  >
                    Bowling Costs in the US
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/bowling-cost/${stateSlug.toLowerCase()}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Bowling Costs in {state}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Bowling Specials Column */}
            <div>
              <h3 className="font-semibold mb-3">Bowling Specials</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/specials"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    data-testid="link-all-specials"
                  >
                    All Bowling Specials
                  </Link>
                </li>
                {city && state && (
                  <li>
                    <Link
                      href={`/specials/${state.replace(/\s+/g, "-")}/${city.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="link-city-bowling-specials"
                    >
                      Bowling Specials in {city}
                    </Link>
                  </li>
                )}
                {state && (
                  <li>
                    <Link
                      href={`/specials/${state.replace(/\s+/g, "-")}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="link-state-bowling-specials"
                    >
                      Bowling Specials in {state}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
