import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  ExternalLink,
  Edit,
  MapPin,
  Star,
  Building2,
  Home,
} from "lucide-react";
import {
  getVenuesByOwner,
  type Venue,
} from "@/lib/firestore";
import { Helmet } from "react-helmet-async";

export default function MyVenues() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect only after auth has settled and we know user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Fetch owned venues
  const {
    data: ownedVenues,
    isLoading: venuesLoading,
    error: venuesError,
  } = useQuery({
    queryKey: ["/api/user/venues", user?.uid],
    queryFn: () => getVenuesByOwner(user!.uid),
    enabled: !!user,
  });

  // Wait for auth to settle before redirecting or rendering
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Venues - BowlingAlleys.io</title>
        <meta name="description" content="Manage your claimed bowling alleys, update venue information, and view customer feedback." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 h-8 px-2"
                  data-testid="breadcrumb-home"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <span>/</span>
              <span className="font-medium text-foreground">My Venues</span>
            </nav>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              My Venues
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your claimed bowling alleys and track customer feedback
            </p>
          </div>

          {/* Venues List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                My Claimed Bowling Alleys
              </CardTitle>
              <CardDescription>Venues you own or manage</CardDescription>
            </CardHeader>
            <CardContent>
              {venuesLoading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading venues...
                  </p>
                </div>
              ) : venuesError ? (
                <div className="py-8 text-center text-destructive">
                  <p>Error loading venues. Please try again.</p>
                </div>
              ) : ownedVenues && ownedVenues.length > 0 ? (
                <div className="space-y-4">
                  {ownedVenues.map((venue: Venue) => (
                    <div
                      key={venue.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`venue-card-${venue.id}`}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{venue.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {venue.city}, {venue.state}
                        </p>
                        {venue.avgRating > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                              {venue.avgRating.toFixed(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({venue.reviewCount} review
                              {venue.reviewCount !== 1 ? "s" : ""})
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/my-venues/${venue.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-edit-venue-${venue.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/venue/${venue.id}`)}
                          data-testid={`button-view-venue-${venue.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You haven't claimed any bowling alleys yet.</p>
                  <p className="text-sm mt-2">
                    Visit a bowling alley page and click "Claim This Alley"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </>
  );
}
