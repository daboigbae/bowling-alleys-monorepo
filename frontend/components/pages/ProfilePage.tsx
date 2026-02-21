import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { User, Upload, ImageIcon, MapPin, Clock, DollarSign, Pencil, Star, Mail, Globe, ExternalLink, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "firebase/auth";
import { getSuggestionsByUserId, updateSuggestion, Suggestion, getReviewsByUserId, ReviewWithVenue, getUserProfile, updateUserProfile, type User as FirestoreUser } from "@/lib/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

// URL validation helper
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
};

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showReviewsOnProfile, setShowReviewsOnProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  
  const ITEMS_PER_PAGE = 5;
  
  // Edit suggestion state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [editVenueName, setEditVenueName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editNumberOfLanes, setEditNumberOfLanes] = useState("");
  const [editBusinessHours, setEditBusinessHours] = useState("");
  const [editPricePerGame, setEditPricePerGame] = useState("");
  const [editPricePerHour, setEditPricePerHour] = useState("");
  const [editShoeRentalPrice, setEditShoeRentalPrice] = useState("");

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["suggestions", user?.uid],
    queryFn: () => getSuggestionsByUserId(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["user-reviews", user?.uid],
    queryFn: () => getReviewsByUserId(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: firestoreProfile } = useQuery({
    queryKey: ["user-profile", user?.uid],
    queryFn: () => getUserProfile(user!.uid),
    enabled: !!user?.uid,
  });

  // Load existing profile data
  useEffect(() => {
    if (firestoreProfile) {
      if (firestoreProfile.bio) setBio(firestoreProfile.bio);
      if (firestoreProfile.website) setWebsiteUrl(firestoreProfile.website);
      if (firestoreProfile.showReviewsOnProfile !== undefined) {
        setShowReviewsOnProfile(firestoreProfile.showReviewsOnProfile);
      }
    }
  }, [firestoreProfile]);

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a PNG, JPG, or GIF image",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Display name required",
        description: "Please enter a display name",
        variant: "destructive",
      });
      return;
    }

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      toast({
        title: "Invalid website URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update Firebase Auth profile
      const newPhotoURL = previewImage || photoURL || null;
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
      });

      // Update Firestore profile with bio/website/privacy settings
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        photoURL: newPhotoURL ?? undefined,
        bio: bio.trim(),
        website: websiteUrl.trim(),
        showReviewsOnProfile,
      });

      // Invalidate the profile query
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.uid] });

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });

      if (previewImage) {
        setPhotoURL(previewImage);
        setPreviewImage(null);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPhoto = previewImage || photoURL;

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Suggestion> }) => {
      await updateSuggestion(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions", user?.uid] });
      toast({
        title: "Suggestion updated",
        description: "Your suggestion has been updated successfully",
      });
      setEditDialogOpen(false);
      setEditingSuggestion(null);
    },
    onError: (error) => {
      console.error("Failed to update suggestion:", error);
      toast({
        title: "Error",
        description: "Failed to update suggestion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion);
    setEditVenueName(suggestion.venueName || "");
    setEditAddress(suggestion.address || "");
    setEditCity(suggestion.city);
    setEditState(suggestion.state);
    setEditNumberOfLanes(suggestion.numberOfLanes?.toString() || "");
    setEditBusinessHours(suggestion.businessHours || "");
    setEditPricePerGame(suggestion.pricePerGame?.toString() || "");
    setEditPricePerHour(suggestion.pricePerHour?.toString() || "");
    setEditShoeRentalPrice(suggestion.shoeRentalPrice?.toString() || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingSuggestion) return;
    if (!editCity.trim() || !editState.trim()) {
      toast({
        title: "Required fields missing",
        description: "City and State are required",
        variant: "destructive",
      });
      return;
    }

    // Build update data object with only defined values (Firestore doesn't accept undefined)
    const updateData: Partial<Suggestion> = {
      city: editCity.trim(),
      state: editState.trim(),
    };
    
    if (editVenueName.trim()) updateData.venueName = editVenueName.trim();
    if (editAddress.trim()) updateData.address = editAddress.trim();
    if (editNumberOfLanes) updateData.numberOfLanes = parseInt(editNumberOfLanes);
    if (editBusinessHours.trim()) updateData.businessHours = editBusinessHours.trim();
    if (editPricePerGame) updateData.pricePerGame = parseFloat(editPricePerGame);
    if (editPricePerHour) updateData.pricePerHour = parseFloat(editPricePerHour);
    if (editShoeRentalPrice) updateData.shoeRentalPrice = parseFloat(editShoeRentalPrice);

    updateSuggestionMutation.mutate({
      id: editingSuggestion.id,
      data: updateData,
    });
  };

  return (
    <>
      <Helmet>
        <title>Profile | BowlingAlleys.io</title>
        <meta name="description" content="Update your profile information on BowlingAlleys.io" />
      </Helmet>

      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header with Public Profile Link */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <h1 className="text-2xl font-bold">My Profile</h1>
            {firestoreProfile?.slug && (
              <Link href={`/u/${firestoreProfile.slug}`}>
                <Button variant="outline" size="sm" data-testid="button-view-public-profile">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </Link>
            )}
          </div>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="info" data-testid="tab-info">
                <User className="h-4 w-4 mr-2" />
                Bowler Profile
              </TabsTrigger>
              <TabsTrigger value="locations" data-testid="tab-locations">
                <MapPin className="h-4 w-4 mr-2" />
                Alleys Suggested
              </TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-reviews">
                <Star className="h-4 w-4 mr-2" />
                Alleys Reviewed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Profile Information</CardTitle>
                  <CardDescription>Update your public profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Profile Picture</Label>
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24 border-2 border-muted">
                    <AvatarImage src={currentPhoto || undefined} />
                    <AvatarFallback className="text-2xl">
                      {displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div 
                    className="flex-1 border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-profile-image"
                  >
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="mb-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      data-testid="button-upload-image"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif"
                      className="hidden"
                      onChange={handleImageUpload}
                      data-testid="input-profile-image"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name *
                </Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  data-testid="input-display-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  Bio
                  <span className="text-xs text-muted-foreground font-normal">
                    ({bio.length}/140)
                  </span>
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 140) {
                      setBio(e.target.value);
                    }
                  }}
                  placeholder="Tell us a bit about yourself (optional)"
                  maxLength={140}
                  className="resize-none"
                  rows={3}
                  data-testid="input-bio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com (optional)"
                  data-testid="input-website"
                />
                {websiteUrl && !isValidUrl(websiteUrl) && (
                  <p className="text-xs text-destructive">
                    Please enter a valid URL (e.g., https://example.com)
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={isSubmitting}
                  data-testid="button-save-profile"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locations">
              {/* User Suggestions Section */}
              <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Your Alley Suggestions
              </CardTitle>
              <CardDescription>
                Bowling alleys you've suggested for us to add
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestionsLoading ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  You haven't suggested any locations yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestions
                    .slice((suggestionsPage - 1) * ITEMS_PER_PAGE, suggestionsPage * ITEMS_PER_PAGE)
                    .map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="border rounded-lg p-4 space-y-2"
                      data-testid={`suggestion-${suggestion.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {suggestion.venueName && (
                            suggestion.venueId ? (
                              <Link 
                                href={`/venue/${suggestion.venueId}`}
                                className="font-medium hover:underline text-primary"
                                data-testid={`link-suggestion-venue-${suggestion.id}`}
                              >
                                {suggestion.venueName}
                              </Link>
                            ) : (
                              <p className="font-medium">{suggestion.venueName}</p>
                            )
                          )}
                          <p className="text-sm text-muted-foreground">
                            {suggestion.city}, {suggestion.state}
                          </p>
                          {suggestion.address && (
                            <p className="text-sm text-muted-foreground">
                              {suggestion.address}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {suggestion.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(suggestion)}
                              data-testid={`button-edit-suggestion-${suggestion.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Badge
                            variant={
                              suggestion.status === "implemented"
                                ? "default"
                                : suggestion.status === "reviewed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {suggestion.status === "implemented"
                              ? "Added"
                              : suggestion.status === "reviewed"
                              ? "Reviewed"
                              : "Pending"}
                          </Badge>
                        </div>
                      </div>

                      {(suggestion.numberOfLanes || suggestion.businessHours || suggestion.pricePerGame || suggestion.pricePerHour || suggestion.shoeRentalPrice) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          {suggestion.numberOfLanes && (
                            <span className="text-xs text-muted-foreground">
                              {suggestion.numberOfLanes} lanes
                            </span>
                          )}
                          {suggestion.businessHours && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {suggestion.businessHours}
                            </span>
                          )}
                          {suggestion.pricePerGame && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${suggestion.pricePerGame}/game
                            </span>
                          )}
                          {suggestion.pricePerHour && (
                            <span className="text-xs text-muted-foreground">
                              ${suggestion.pricePerHour}/hr
                            </span>
                          )}
                          {suggestion.shoeRentalPrice && (
                            <span className="text-xs text-muted-foreground">
                              ${suggestion.shoeRentalPrice} shoes
                            </span>
                          )}
                        </div>
                      )}

                      {suggestion.createdAt && (
                        <p className="text-xs text-muted-foreground pt-1">
                          Submitted {suggestion.createdAt.toDate?.().toLocaleDateString() || "recently"}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Suggestions Pagination */}
                  {suggestions.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSuggestionsPage(p => Math.max(1, p - 1))}
                        disabled={suggestionsPage === 1}
                        data-testid="button-suggestions-prev"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {suggestionsPage} of {Math.ceil(suggestions.length / ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSuggestionsPage(p => Math.min(Math.ceil(suggestions.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={suggestionsPage >= Math.ceil(suggestions.length / ITEMS_PER_PAGE)}
                        data-testid="button-suggestions-next"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              {/* Reviews Section */}
              <Card data-testid="card-reviews">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                My Reviews
              </CardTitle>
              <CardDescription>
                Reviews you've left for bowling alleys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Public Profile Toggle - More Prominent */}
              <div className={`flex items-center justify-between gap-3 p-4 rounded-lg border-2 transition-colors ${
                showReviewsOnProfile 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                  : 'bg-muted/30 border-muted-foreground/20'
              }`}>
                <div className="flex items-center gap-3">
                  <Eye className={`h-5 w-5 ${showReviewsOnProfile ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                  <div className="space-y-0.5">
                    <Label htmlFor="show-reviews" className="text-sm font-semibold cursor-pointer">
                      Show reviews on public profile
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {showReviewsOnProfile 
                        ? '✓ Others can see your reviews on your public profile' 
                        : 'Your reviews are hidden from your public profile'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="show-reviews"
                  checked={showReviewsOnProfile}
                  onCheckedChange={async (checked) => {
                    setShowReviewsOnProfile(checked);
                    // Auto-save this setting immediately
                    try {
                      await updateUserProfile(user.uid, { showReviewsOnProfile: checked });
                      queryClient.invalidateQueries({ queryKey: ["user-profile", user.uid] });
                      toast({
                        title: checked ? "Reviews visible" : "Reviews hidden",
                        description: checked 
                          ? "Your reviews are now visible on your public profile" 
                          : "Your reviews are now hidden from your public profile",
                      });
                    } catch (error) {
                      console.error("Failed to save setting:", error);
                      setShowReviewsOnProfile(!checked); // Revert on error
                    }
                  }}
                  data-testid="switch-show-reviews"
                />
              </div>
              
              {reviewsLoading ? (
                <p className="text-muted-foreground text-sm">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You haven't reviewed any bowling alleys yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews
                    .slice((reviewsPage - 1) * ITEMS_PER_PAGE, reviewsPage * ITEMS_PER_PAGE)
                    .map((review: ReviewWithVenue) => (
                    <div
                      key={`${review.venueId}-${review.id}`}
                      className="p-4 border rounded-lg space-y-2"
                      data-testid={`review-item-${review.venueId}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/venue/${review.venueId}`}
                          className="font-medium hover:underline"
                          data-testid={`link-venue-${review.venueId}`}
                        >
                          {review.venueName}
                        </Link>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
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
                      
                      {review.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {review.createdAt.toDate?.().toLocaleDateString() || "Recently"}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Reviews Pagination */}
                  {reviews.length > ITEMS_PER_PAGE && (
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
                        Page {reviewsPage} of {Math.ceil(reviews.length / ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewsPage(p => Math.min(Math.ceil(reviews.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={reviewsPage >= Math.ceil(reviews.length / ITEMS_PER_PAGE)}
                        data-testid="button-reviews-next"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Suggestion Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Suggestion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-venue-name">Venue Name (optional)</Label>
              <Input
                id="edit-venue-name"
                value={editVenueName}
                onChange={(e) => setEditVenueName(e.target.value)}
                placeholder="Enter venue name"
                data-testid="input-edit-venue-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address (optional)</Label>
              <Input
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Enter street address"
                data-testid="input-edit-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City *</Label>
                <Input
                  id="edit-city"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="City"
                  required
                  data-testid="input-edit-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State *</Label>
                <Input
                  id="edit-state"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="State"
                  required
                  data-testid="input-edit-state"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">Additional Details (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-lanes">Number of Lanes</Label>
                  <Input
                    id="edit-lanes"
                    type="number"
                    min="1"
                    value={editNumberOfLanes}
                    onChange={(e) => setEditNumberOfLanes(e.target.value)}
                    placeholder="e.g. 24"
                    data-testid="input-edit-lanes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hours">Business Hours</Label>
                  <Input
                    id="edit-hours"
                    value={editBusinessHours}
                    onChange={(e) => setEditBusinessHours(e.target.value)}
                    placeholder="e.g. 9am-10pm"
                    data-testid="input-edit-hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price-game">Price per Game ($)</Label>
                  <Input
                    id="edit-price-game"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPricePerGame}
                    onChange={(e) => setEditPricePerGame(e.target.value)}
                    placeholder="e.g. 5.50"
                    data-testid="input-edit-price-game"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price-hour">Price per Hour ($)</Label>
                  <Input
                    id="edit-price-hour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPricePerHour}
                    onChange={(e) => setEditPricePerHour(e.target.value)}
                    placeholder="e.g. 25.00"
                    data-testid="input-edit-price-hour"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-shoe-rental">Shoe Rental Price ($)</Label>
                  <Input
                    id="edit-shoe-rental"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editShoeRentalPrice}
                    onChange={(e) => setEditShoeRentalPrice(e.target.value)}
                    placeholder="e.g. 4.00"
                    data-testid="input-edit-shoe-rental"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateSuggestionMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateSuggestionMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
