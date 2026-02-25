import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Globe,
  Facebook,
  Award,
  ExternalLink,
  Code,
  Copy,
  Check,
  LogOut,
  Trash2,
  HelpCircle,
  BookOpen,
  DollarSign,
  TrendingUp,
  FileText,
} from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import {
  getUserProfile,
  updateUserProfile,
  getVenuesByOwner,
  isSlugTaken,
  type Venue,
} from "@/lib/firestore";
import { ImageUploader } from "@/components/ImageUploader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export default function Account() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    displayName: "",
    photoURL: "",
    slug: "",
    bio: "",
    businessName: "",
    website: "",
    facebook: "",
    phone: "",
    allowUserEmails: true, // Default to true
    allowOwnerEmails: true, // Default to true
  });

  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Helper component for labels with tooltips
  const LabelWithTooltip = ({ 
    htmlFor, 
    label, 
    tooltip,
    icon 
  }: { 
    htmlFor: string; 
    label: string; 
    tooltip: string;
    icon?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  // Fetch user profile
  const {
    data: profile,
    isLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["/api/user/profile", user?.uid],
    queryFn: () => getUserProfile(user!.uid),
    enabled: !!user,
  });

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

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || "",
        photoURL: profile.photoURL || "",
        slug: profile.slug || "",
        bio: profile.bio || "",
        businessName: profile.businessName || "",
        website: profile.website || "",
        facebook: profile.facebook || "",
        phone: profile.phone || "",
        allowUserEmails: profile.allowUserEmails ?? true, // Default to true if not set
        allowOwnerEmails: profile.allowOwnerEmails ?? true, // Default to true if not set
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Not authenticated");

      // Check slug uniqueness if slug is being updated
      if (data.slug && data.slug !== profile?.slug) {
        const slugTaken = await isSlugTaken(data.slug, user.uid);
        if (slugTaken) {
          throw new Error(
            "This profile URL is already in use. Please choose a different one.",
          );
        }
      }

      // Update Firestore profile
      await updateUserProfile(user.uid, data);

      // Also update Firebase Auth profile to keep photoURL and displayName in sync
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: data.photoURL || null,
      });

      // Force refresh the user to get the updated profile
      await user.reload();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: any) => {
      const isSlugError =
        error.message?.includes("profile URL") ||
        error.message?.includes("already in use");
      toast({
        title: isSlugError ? "Profile URL already taken" : "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const copyEmbedCode = (code: string, embedType: string) => {
    navigator.clipboard.writeText(code);
    setCopiedEmbed(embedType);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  const generateBadgeEmbed = (venue: Venue) => {
    const baseUrl = window.location.origin;
    return `<a href="${baseUrl}/venue/${venue.id}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);color:white;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(220,38,38,0.25);transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(220,38,38,0.35)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(220,38,38,0.25)';">
  <span style="font-size:18px;">🎳</span>
  <span>${venue.avgRating > 0 ? "⭐ " + venue.avgRating.toFixed(1) : "Rate us"} - ${venue.name}</span>
</a>`;
  };

  const generateReviewWidgetEmbed = (venue: Venue) => {
    const baseUrl = window.location.origin;
    return `<div style="max-width:400px;padding:24px;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);border-radius:16px;color:white;font-family:system-ui,sans-serif;box-shadow:0 8px 24px rgba(220,38,38,0.3);">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <span style="font-size:32px;">🎳</span>
    <div style="flex:1;">
      <h3 style="margin:0 0 4px;font-size:20px;font-weight:700;line-height:1.2;">${venue.name}</h3>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;font-weight:700;">${venue.avgRating > 0 ? "⭐ " + venue.avgRating.toFixed(1) : "✨ New"}</span>
        <span style="font-size:13px;opacity:0.9;">${venue.reviewCount > 0 ? `(${venue.reviewCount} review${venue.reviewCount !== 1 ? "s" : ""})` : "(Be the first!)"}</span>
      </div>
    </div>
  </div>
  <a href="${baseUrl}/venue/${venue.id}" target="_blank" style="display:inline-block;width:100%;padding:12px 24px;background:white;color:#dc2626;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.25)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';">
    Leave a Review on BowlingAlleys.io →
  </a>
</div>`;
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setDeleteDialogOpen(false);
      router.replace("/");
    } catch (error) {
      setDeleteDialogOpen(false);
    }
  };

  const handleSignOut = () => {
    logout();
    router.replace("/");
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Profile</h1>
        <p className="text-muted-foreground mb-6">
          We couldn't load your profile. Please try again.
        </p>
        <Button onClick={() => router.push("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground mt-2">
            Manage your profile and claimed bowling alleys
          </p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="owner" disabled={!profile?.isVerifiedOwner}>
              Owner Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            {/* Account Settings */}
            <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account security and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>

              {/* Email Preferences */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="allow-user-emails"
                  checked={formData.allowUserEmails}
                  onCheckedChange={(checked) => {
                    const boolValue = checked === true;
                    handleChange("allowUserEmails", boolValue);
                    updateMutation.mutate({ ...formData, allowUserEmails: boolValue });
                  }}
                  className="mt-0.5"
                  data-testid="checkbox-allow-user-emails"
                />
                <Label htmlFor="allow-user-emails" className="flex-1 cursor-pointer">
                  <p className="font-medium">Platform Email Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about new features, community highlights, and platform news
                  </p>
                </Label>
              </div>
              
              {profile?.isVerifiedOwner && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="allow-owner-emails"
                    checked={formData.allowOwnerEmails}
                    onCheckedChange={(checked) => {
                      const boolValue = checked === true;
                      handleChange("allowOwnerEmails", boolValue);
                      updateMutation.mutate({ ...formData, allowOwnerEmails: boolValue });
                    }}
                    className="mt-0.5"
                    data-testid="checkbox-allow-owner-emails"
                  />
                  <Label htmlFor="allow-owner-emails" className="flex-1 cursor-pointer">
                    <p className="font-medium">Business Email Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Receive review alerts, analytics reports, customer feedback, and business insights
                    </p>
                  </Label>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full p-3 rounded-md border text-left hover-elevate"
                  data-testid="button-sign-out"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <button
                      className="flex items-center gap-3 w-full p-3 rounded-md border text-left hover-elevate"
                      data-testid="button-delete-account"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Account</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all of your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="owner" className="space-y-6">
          {/* Your Public Profile */}
          {profile?.isVerifiedOwner && formData.slug && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  Your Public Profile
                </CardTitle>
                <CardDescription>
                  Share this link with customers and partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">bowlingalleys.io/owner/{formData.slug}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your SEO-optimized public profile page
                    </p>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => router.push(`/owner/${formData.slug}`)}
                    data-testid="button-view-public-profile"
                  >
                    View Profile
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Owner Profile */}
          {profile?.isVerifiedOwner && (
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <CardTitle>Owner Profile</CardTitle>
                </div>
                <CardDescription>
                  Create a public SEO-optimized profile page that showcases your bowling business and links to your claimed venues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      htmlFor="slug" 
                      label="Profile URL Slug" 
                      tooltip="Your custom profile URL. This is managed by our team to ensure consistency and prevent conflicts. Contact us if you need to update your profile URL."
                    />
                    <Input
                      id="slug"
                      value={formData.slug}
                      disabled
                      className="bg-muted"
                      data-testid="input-slug"
                    />
                    {formData.slug && (
                      <p className="text-xs text-muted-foreground">
                        Your profile: bowlingalleys.io/owner/{formData.slug}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip 
                      htmlFor="businessName" 
                      label="Business Name" 
                      tooltip="The name of your bowling business or organization. Example: 'ABC Bowling Centers' or 'Smith Family Entertainment'. This appears on your owner profile page and helps establish your brand."
                    />
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) =>
                        handleChange("businessName", e.target.value)
                      }
                      placeholder="ABC Bowling Centers"
                      data-testid="input-business-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip 
                      htmlFor="bio" 
                      label="Bio" 
                      tooltip="Tell your story! Share your background in the bowling industry, your management philosophy, or what makes your venues special. Example: 'Third-generation bowling alley owner with 25 years of experience creating family-friendly entertainment.' This appears prominently on your profile page."
                    />
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      placeholder="Third-generation bowling alley owner passionate about creating memorable experiences..."
                      rows={4}
                      data-testid="input-bio"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <LabelWithTooltip 
                        htmlFor="website" 
                        label="Website" 
                        tooltip="Your business website URL. Example: https://yourbowling.com. This creates a link on your profile page so customers can learn more about your venues. Include the full URL starting with https://"
                        icon={<Globe className="h-4 w-4" />}
                      />
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) =>
                          handleChange("website", e.target.value)
                        }
                        placeholder="https://yourbowling.com"
                        data-testid="input-website"
                      />
                    </div>

                    <div className="space-y-2">
                      <LabelWithTooltip 
                        htmlFor="phone" 
                        label="Phone" 
                        tooltip="Your main business contact number. Example: (555) 123-4567. This makes it easy for customers, potential partners, or media to reach you directly."
                        icon={<Phone className="h-4 w-4" />}
                      />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleChange("phone", e.target.value)
                        }
                        placeholder="(555) 123-4567"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip 
                      htmlFor="facebook" 
                      label="Facebook URL" 
                      tooltip="Your business Facebook page URL. Example: https://facebook.com/yourbowling. This helps customers connect with you on social media and see your latest updates and promotions."
                      icon={<SiFacebook className="h-4 w-4" />}
                    />
                    <Input
                      id="facebook"
                      type="url"
                      value={formData.facebook}
                      onChange={(e) =>
                        handleChange("facebook", e.target.value)
                      }
                      placeholder="https://facebook.com/yourbowling"
                      data-testid="input-facebook"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || isLoading}
                      data-testid="button-save-owner-profile"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Manage Bowling Alleys Link */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                My Claimed Bowling Alleys
              </CardTitle>
              <CardDescription>Manage your venues and view customer feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-4">
                    Edit venue details, view customer reviews, track accuracy feedback, and more from your dedicated venue management dashboard.
                  </p>
                  {venuesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading venues...</p>
                  ) : venuesError ? (
                    <p className="text-sm text-destructive">Error loading venue count</p>
                  ) : ownedVenues && ownedVenues.length > 0 ? (
                    <Badge variant="secondary" className="text-sm">
                      {ownedVenues.length} venue{ownedVenues.length !== 1 ? "s" : ""} claimed
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No venues claimed yet</p>
                  )}
                </div>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => router.push("/my-venues")}
                data-testid="button-manage-venues"
              >
                <Award className="mr-2 h-4 w-4" />
                Manage My Venues
              </Button>
            </CardContent>
          </Card>

          {/* Important Resources */}
          {profile?.isVerifiedOwner && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Important Resources
                </CardTitle>
                <CardDescription>
                  Essential guides and tools to help you succeed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <a
                    href="/blog/release-notes-v1-0-0"
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover-elevate active-elevate-2 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        Platform Release Notes v1.0.0
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Major features, CRM tools, and everything new in our official platform launch
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>

                  <a
                    href="/bowling-costs"
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover-elevate active-elevate-2 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        Bowling Cost Data
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        See average bowling prices across the country and how your pricing compares
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>

                  <a
                    href="/blog/bowling-alley-owner-onboarding-guide"
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover-elevate active-elevate-2 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        Owner Onboarding Guide
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete guide to getting the most out of BowlingAlleys.io for your business
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>

                  <a
                    href="/blog/5-things-bowling-alley-owners-should-know-2025"
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover-elevate active-elevate-2 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        5 Things Every Owner Should Know in 2025
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Modern strategies to attract customers and grow your bowling business
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>

                  <a
                    href="/owner"
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover-elevate active-elevate-2 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        Partnership Benefits & Program
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Learn about our Founding Partner program and exclusive benefits for early adopters
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
