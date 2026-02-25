import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Globe, Phone, Star, Award } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { getUserBySlug, getVenuesByOwner, type Venue } from "@/lib/firestore";
import VenueCard from "@/components/VenueCard";

interface OwnerProfilePageProps { slug?: string; }
export default function OwnerProfile({ slug: propSlug }: OwnerProfilePageProps = {}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = propSlug ?? (typeof params?.slug === "string" ? params.slug : undefined);

  // Fetch owner profile by slug
  const { data: owner, isLoading, error } = useQuery({
    queryKey: ["/api/owner", slug],
    queryFn: () => getUserBySlug(slug!),
    enabled: !!slug,
  });

  // Fetch owned venues
  const { data: venues, isLoading: venuesLoading, error: venuesError } = useQuery({
    queryKey: ["/api/owner/venues", owner?.id],
    queryFn: () => getVenuesByOwner(owner!.id),
    enabled: !!owner?.id,
  });

  // Calculate stats
  const totalVenues = venues?.length || 0;
  const totalReviews = venues?.reduce((sum, v) => sum + (v.reviewCount || 0), 0) || 0;
  const avgRating = venues && venues.length > 0
    ? venues.reduce((sum, v) => sum + (v.avgRating || 0), 0) / venues.length
    : 0;

  // Handle not found
  if (!isLoading && (!owner || error)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Owner Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This owner profile doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  if (isLoading || !owner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading owner profile...</p>
        </div>
      </div>
    );
  }

  const pageTitle = owner.businessName || owner.displayName;
  const pageDescription = owner.bio || `Bowling alley owner managing ${totalVenues} location${totalVenues !== 1 ? 's' : ''} with ${avgRating.toFixed(1)} average rating across ${totalReviews} reviews.`;
  const canonicalUrl = `https://bowlingalleys.io/owner/${slug}`;

  // Schema.org structured data
  const schemaData = owner.businessName
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": owner.businessName,
        "description": owner.bio,
        "url": owner.website || canonicalUrl,
        "telephone": owner.phone,
        "sameAs": owner.facebook ? [owner.facebook] : [],
        "aggregateRating": totalReviews > 0 ? {
          "@type": "AggregateRating",
          "ratingValue": avgRating.toFixed(1),
          "reviewCount": totalReviews,
        } : undefined,
      }
    : {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": owner.displayName,
        "description": owner.bio,
        "url": owner.website || canonicalUrl,
        "telephone": owner.phone,
        "sameAs": owner.facebook ? [owner.facebook] : [],
      };

  return (
    <>
      <Helmet>
        <title>{pageTitle} - Bowling Alley Owner | BowlingAlleys.io</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${pageTitle} - Bowling Alley Owner`} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${pageTitle} - Bowling Alley Owner`} />
        <meta name="twitter:description" content={pageDescription} />

        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-8 max-w-6xl flex-1">
          {/* Breadcrumb Navigation */}
          <Breadcrumb className="mb-6" data-testid="breadcrumb-navigation">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" data-testid="link-breadcrumb-home">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/owner" data-testid="link-breadcrumb-owners">
                    For Alley Owners
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="text-breadcrumb-owner-name">
                  {owner.businessName || owner.displayName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Owner Header */}
          <div className="mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={owner.photoURL} alt={owner.displayName} />
                    <AvatarFallback className="text-2xl">
                      {owner.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-3xl font-bold">
                          {owner.businessName || owner.displayName}
                        </h1>
                        {owner.businessName && (
                          <p className="text-lg text-muted-foreground mt-1">
                            {owner.displayName}
                          </p>
                        )}
                        {owner.isVerifiedOwner && (
                          <Badge variant="default" className="mt-2">
                            <Award className="h-3 w-3 mr-1" />
                            Verified Owner
                          </Badge>
                        )}
                      </div>
                    </div>

                    {owner.bio && (
                      <p className="mt-4 text-muted-foreground max-w-2xl">
                        {owner.bio}
                      </p>
                    )}

                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      {owner.website && (
                        <a
                          href={owner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <Globe className="h-4 w-4" />
                          Website
                        </a>
                      )}
                      {owner.phone && (
                        <a
                          href={`tel:${owner.phone}`}
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {owner.phone}
                        </a>
                      )}
                      {owner.facebook && (
                        <a
                          href={owner.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <SiFacebook className="h-4 w-4" />
                          Facebook
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          {totalVenues > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{totalVenues}</p>
                    <p className="text-sm text-muted-foreground">
                      Location{totalVenues !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold flex items-center justify-center gap-1">
                      <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                      {avgRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Average Rating
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{totalReviews}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Review{totalReviews !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Owned Venues */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Bowling Locations
            </h2>
            {venuesLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Loading venues...</p>
                </CardContent>
              </Card>
            ) : venuesError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-destructive">Error loading venues. Please try again.</p>
                </CardContent>
              </Card>
            ) : venues && venues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue: Venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    onViewDetails={(id) => router.push(`/venue/${id}`)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No bowling alleys listed yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
