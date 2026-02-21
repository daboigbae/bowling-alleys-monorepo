import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Star, MapPin, Share2, Copy, Check, ExternalLink, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { FacebookShareButton, TwitterShareButton, FacebookIcon, XIcon } from "react-share";
import { getUserBySlug, getSuggestionsByUserId, getReviewsByUserId, type User, type Suggestion, type ReviewWithVenue } from "@/lib/firestore";

const REVIEWS_PER_PAGE = 5;

interface UserProfilePageProps { slug?: string; }
export default function UserProfile({ slug: propSlug }: UserProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = propSlug ?? paramSlug;
  const [, setLocation] = useLocation();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["/api/user-profile", slug],
    queryFn: () => getUserBySlug(slug!),
    enabled: !!slug,
  });

  const { data: allSuggestions = [] } = useQuery({
    queryKey: ["user-suggestions", profile?.id],
    queryFn: () => getSuggestionsByUserId(profile!.id),
    enabled: !!profile?.id,
  });

  // Only show implemented suggestions on public profile
  const suggestions = allSuggestions.filter((s: Suggestion) => s.status === "implemented");

  const { data: reviews = [] } = useQuery({
    queryKey: ["user-public-reviews", profile?.id],
    queryFn: () => getReviewsByUserId(profile!.id),
    enabled: !!profile?.id && !!profile?.showReviewsOnProfile,
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/u/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoading && (!profile || error)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This user profile doesn't exist or has been removed.
        </p>
        <Button onClick={() => setLocation("/")} data-testid="button-back-home">
          Back to Home
        </Button>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Pagination for reviews
  const totalReviewPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = reviews.slice(
    (reviewsPage - 1) * REVIEWS_PER_PAGE,
    reviewsPage * REVIEWS_PER_PAGE
  );

  const showReviews = profile.showReviewsOnProfile && reviews.length > 0;
  const showContributions = suggestions.length > 0;
  
  // Calculate Pin Points
  // +5 for suggesting an alley, +3 for review with text, +1 for review without text
  const pinPoints = suggestions.length * 5 + reviews.reduce((total, review) => {
    return total + (review.text ? 3 : 1);
  }, 0);

  // SEO Meta - uses pinPoints so must come after calculation
  const pageTitle = `Check out ${profile.displayName}'s BowlingAlleys.io Profile`;
  const bioText = profile.bio ? `${profile.bio} ` : '';
  const pageDescription = `${bioText}${profile.displayName} has earned ${pinPoints} Pin Points on BowlingAlleys.io. Join our community of bowling enthusiasts to discover alleys, share reviews, and connect with fellow bowlers!`;
  const canonicalUrl = `https://bowlingalleys.io/u/${slug}`;
  const ogImageUrl = profile.photoURL || `https://bowlingalleys.io/og-default-profile.png`;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.displayName,
    "description": profile.bio,
    "url": profile.website || canonicalUrl,
    "image": profile.photoURL,
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} | BowlingAlleys.io</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={`${pageTitle} | BowlingAlleys.io`} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={ogImageUrl} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${pageTitle} | BowlingAlleys.io`} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />

        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="h-24 w-24 border-2 border-muted">
                  <AvatarImage src={profile.photoURL || undefined} />
                  <AvatarFallback className="text-3xl">
                    {profile.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2">
                    <h1 className="text-2xl font-bold" data-testid="text-profile-name">
                      {profile.displayName}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShareDialogOpen(true)}
                      data-testid="button-share-profile"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {profile.bio && (
                    <p className="text-muted-foreground mb-3" data-testid="text-profile-bio">
                      {profile.bio}
                    </p>
                  )}

                  {profile.website && (
                    <a
                      href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-3"
                      data-testid="link-profile-website"
                    >
                      <Globe className="h-4 w-4" />
                      {profile.website.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
                    {/* Pin Points Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-full" data-testid="badge-pin-points">
                      <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{pinPoints} Pin Points</span>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      {reviews.length} Review{reviews.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {suggestions.length} Bowling Alley{suggestions.length !== 1 ? "s" : ""} Discovered
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {(showReviews || showContributions) && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <Tabs defaultValue={showReviews ? "reviews" : "contributions"}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="reviews" disabled={!showReviews} data-testid="tab-reviews">
                      <Star className="h-4 w-4 mr-2" />
                      Reviews ({reviews.length})
                    </TabsTrigger>
                    <TabsTrigger value="contributions" disabled={!showContributions} data-testid="tab-contributions">
                      <MapPin className="h-4 w-4 mr-2" />
                      Bowling Alleys Discovered ({suggestions.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="reviews" className="mt-4">
                    {showReviews ? (
                      <div className="space-y-4">
                        {paginatedReviews.map((review: ReviewWithVenue) => (
                          <div
                            key={`${review.venueId}-${review.id}`}
                            className="p-3 border rounded-lg"
                            data-testid={`review-${review.venueId}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Link
                                href={`/venue/${review.venueId}`}
                                className="font-medium hover:underline"
                              >
                                {review.venueName}
                              </Link>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < review.rating
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.text && (
                              <p className="text-sm text-muted-foreground">
                                {review.text}
                              </p>
                            )}
                          </div>
                        ))}

                        {totalReviewPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                              disabled={reviewsPage === 1}
                              data-testid="button-reviews-prev"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {reviewsPage} of {totalReviewPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewsPage(p => Math.min(totalReviewPages, p + 1))}
                              disabled={reviewsPage === totalReviewPages}
                              data-testid="button-reviews-next"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        This user has chosen not to share their reviews publicly.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="contributions" className="mt-4">
                    {showContributions ? (
                      <div className="space-y-3">
                        {suggestions.map((suggestion: Suggestion) => {
                          const venueId = suggestion.assignedVenueId || suggestion.venueId;
                          const cardContent = (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className={`font-medium ${venueId ? "text-primary" : ""}`}>
                                  {suggestion.assignedVenueName || suggestion.venueName || "Bowling Alley"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {suggestion.assignedVenueLocation || `${suggestion.city}, ${suggestion.state}`}
                                </p>
                              </div>
                              <Badge 
                                variant={suggestion.status === "implemented" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {suggestion.status === "implemented" ? "Added" : suggestion.status}
                              </Badge>
                            </div>
                          );
                          
                          return venueId ? (
                            <Link
                              key={suggestion.id}
                              href={`/venue/${venueId}`}
                              className="block p-3 border rounded-lg hover-elevate cursor-pointer"
                              data-testid={`suggestion-${suggestion.id}`}
                            >
                              {cardContent}
                            </Link>
                          ) : (
                            <div
                              key={suggestion.id}
                              className="p-3 border rounded-lg"
                              data-testid={`suggestion-${suggestion.id}`}
                            >
                              {cardContent}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        No contributions yet.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/u/${slug}`}
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-muted"
                data-testid="input-share-url"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex justify-center gap-4">
              <FacebookShareButton url={canonicalUrl} title={pageTitle}>
                <FacebookIcon size={40} round />
              </FacebookShareButton>
              <TwitterShareButton url={canonicalUrl} title={`Check out ${pageTitle}'s bowling profile!`}>
                <XIcon size={40} round />
              </TwitterShareButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
