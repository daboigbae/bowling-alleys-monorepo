import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Star,
  MessageSquare,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  DollarSign,
  Clock,
  Image as ImageIcon,
  Phone,
  Mail,
  Globe,
  HelpCircle,
  X,
  Plus,
  Lightbulb,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import {
  getVenue,
  updateVenue,
  getVenueReviews,
  type Venue,
  type Review,
  type PricingPeriod,
  type AdditionalPricingItem,
  type VenuePricingDetails,
} from "@/lib/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUploader } from "@/components/ImageUploader";
import { PricingPeriodDrawer } from "@/components/PricingPeriodDrawer";
import { PricingPeriodListRow } from "@/components/PricingPeriodListRow";
import { formatDistanceToNow } from "date-fns";
import { Helmet } from "react-helmet-async";
import { nanoid } from "nanoid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EditVenuePageProps { venueId?: string; }
export default function EditVenue({ venueId: propVenueId }: EditVenuePageProps = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const venueId = (propVenueId ?? params?.id) as string | undefined;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    lanes: 1,
    amenities: [] as string[],
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    tikTokUrl: "",
    location: {
      latitude: 0,
      longitude: 0,
    },
    imageUrls: [] as string[],
    weekdayText: ["", "", "", "", "", "", ""] as string[],
    pricing: {
      game: 0,
      hourly: 0,
      shoeRental: 0,
    },
    pricingDetails: {
      periods: [] as PricingPeriod[],
      additionalItems: [] as AdditionalPricingItem[],
      notes: [] as string[],
    },
  });

  const [newAmenity, setNewAmenity] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newNote, setNewNote] = useState("");

  // Drawer state for pricing period editing
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PricingPeriod | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  // Fetch venue data
  const { data: venue, isLoading: venueLoading } = useQuery({
    queryKey: ["venue", venueId],
    queryFn: async () => {
      if (!venueId) throw new Error("No venue ID");
      const venueData = await getVenue(venueId);
      if (!venueData) throw new Error("Venue not found");
      return venueData;
    },
    enabled: !!venueId && !!user,
  });

  // Verify owner has permission - redirect if not
  useEffect(() => {
    if (venue && user && venue.ownerId !== user.uid) {
      toast({
        title: "Access denied",
        description: "You don't have permission to edit this venue",
        variant: "destructive",
      });
      router.replace("/my-venues");
    }
  }, [venue, user, router, toast]);

  // Initialize form data when venue loads
  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || "",
        description: venue.description || "",
        lanes: venue.lanes || 1,
        amenities: venue.amenities || [],
        address: venue.address || "",
        city: venue.city || "",
        state: venue.state || "",
        zipCode: venue.zipCode || "",
        phone: venue.phone || "",
        email: venue.email || "",
        website: venue.website || "",
        facebookUrl: venue.facebookUrl || "",
        instagramUrl: venue.instagramUrl || "",
        twitterUrl: venue.twitterUrl || "",
        tikTokUrl: venue.tikTokUrl || "",
        location: {
          latitude: venue.location?.latitude || 0,
          longitude: venue.location?.longitude || 0,
        },
        imageUrls: venue.imageUrls || [],
        weekdayText: (venue as any).weekdayText || ["", "", "", "", "", "", ""],
        pricing: {
          game: venue.pricing?.game || 0,
          hourly: venue.pricing?.hourly || 0,
          shoeRental: venue.pricing?.shoeRental || 0,
        },
        pricingDetails: {
          periods: venue.pricingDetails?.periods || [],
          additionalItems: venue.pricingDetails?.additionalItems || [],
          notes: venue.pricingDetails?.notes || [],
        },
      });
    }
  }, [venue]);

  // Fetch reviews for this venue
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["venue-reviews", venueId],
    queryFn: async () => {
      if (!venueId) return { reviews: [], total: 0 };
      return getVenueReviews(venueId, 50);
    },
    enabled: !!venueId,
  });

  const reviews = reviewsData?.reviews || [];

  // Update venue mutation
  const updateVenueMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!venueId) throw new Error("No venue ID");
      if (!user) throw new Error("Not authenticated");
      await updateVenue(venueId, data);
    },
    onSuccess: () => {
      toast({
        title: "Venue updated",
        description: "Your venue has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["venue", venueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/venues", user?.uid] });
      router.push("/my-venues");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update venue",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (section: string, field: string, value: any) => {
    setFormData((prev) => {
      const currentSection = prev[section as keyof typeof prev] as Record<
        string,
        any
      >;
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [field]: value,
        },
      };
    });
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()],
      }));
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target === e.currentTarget) {
      e.preventDefault();
      addAmenity();
    }
  };

  // Pricing Details Helper Functions
  // Open drawer for new pricing period
  const addPricingPeriod = () => {
    setEditingPeriod(null); // null indicates new period
    setDrawerOpen(true);
  };

  // Open drawer for editing existing period
  const handleEditPeriod = (period: PricingPeriod) => {
    setEditingPeriod(period);
    setDrawerOpen(true);
  };

  // Save period from drawer (either new or edited)
  const handleSavePeriod = (period: PricingPeriod) => {
    setFormData((prev) => {
      const existingIndex = prev.pricingDetails.periods.findIndex(p => p.id === period.id);
      if (existingIndex >= 0) {
        // Update existing period
        const updatedPeriods = [...prev.pricingDetails.periods];
        updatedPeriods[existingIndex] = period;
        return {
          ...prev,
          pricingDetails: {
            ...prev.pricingDetails,
            periods: updatedPeriods,
          },
        };
      } else {
        // Add new period
        return {
          ...prev,
          pricingDetails: {
            ...prev.pricingDetails,
            periods: [...prev.pricingDetails.periods, period],
          },
        };
      }
    });
  };

  const removePricingPeriod = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        periods: prev.pricingDetails.periods.filter((p) => p.id !== id),
      },
    }));
  };

  const updatePricingPeriod = (id: string, field: keyof PricingPeriod, value: any) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        periods: prev.pricingDetails.periods.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  const togglePeriodDay = (periodId: string, day: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        periods: prev.pricingDetails.periods.map((p) => {
          if (p.id === periodId) {
            const days = p.days.includes(day)
              ? p.days.filter((d) => d !== day)
              : [...p.days, day];
            return { ...p, days };
          }
          return p;
        }),
      },
    }));
  };

  const addConditionToPeriod = (periodId: string, condition: string) => {
    if (!condition.trim()) return;
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        periods: prev.pricingDetails.periods.map((p) =>
          p.id === periodId && !p.conditions?.includes(condition.trim())
            ? { ...p, conditions: [...(p.conditions || []), condition.trim()] }
            : p
        ),
      },
    }));
  };

  const removeConditionFromPeriod = (periodId: string, condition: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        periods: prev.pricingDetails.periods.map((p) =>
          p.id === periodId
            ? { ...p, conditions: (p.conditions || []).filter((c) => c !== condition) }
            : p
        ),
      },
    }));
  };

  const addAdditionalItem = () => {
    const newItem: AdditionalPricingItem = {
      id: nanoid(),
      name: "",
      price: 0,
      unit: "",
    };
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        additionalItems: [...prev.pricingDetails.additionalItems, newItem],
      },
    }));
  };

  const removeAdditionalItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        additionalItems: prev.pricingDetails.additionalItems.filter((item) => item.id !== id),
      },
    }));
  };

  const updateAdditionalItem = (id: string, field: keyof AdditionalPricingItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        additionalItems: prev.pricingDetails.additionalItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addNote = (note: string) => {
    if (!note.trim()) return;
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        notes: [...(prev.pricingDetails.notes || []), note.trim()],
      },
    }));
  };

  const removeNote = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pricingDetails: {
        ...prev.pricingDetails,
        notes: (prev.pricingDetails.notes || []).filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure proper data types for submission
    const submissionData = {
      ...formData,
      lanes: parseInt(formData.lanes.toString()) || 1,
      location: {
        latitude: parseFloat(formData.location.latitude.toString()) || 0,
        longitude: parseFloat(formData.location.longitude.toString()) || 0,
      },
      pricing: {
        game: parseFloat(formData.pricing.game.toString()) || 0,
        hourly: parseFloat(formData.pricing.hourly.toString()) || 0,
        shoeRental: parseFloat(formData.pricing.shoeRental.toString()) || 0,
      },
      // Preserve all 7 weekday entries even if empty to maintain day alignment
      weekdayText: formData.weekdayText,
      // Include pricingDetails with proper number types
      pricingDetails: {
        periods: formData.pricingDetails.periods.map(period => ({
          ...period,
          price: parseFloat(period.price.toString()) || 0,
        })),
        additionalItems: formData.pricingDetails.additionalItems.map(item => ({
          ...item,
          price: parseFloat(item.price.toString()) || 0,
        })),
        notes: formData.pricingDetails.notes || [],
      },
    };

    updateVenueMutation.mutate(submissionData);
  };

  const LabelWithTooltip = ({
    htmlFor,
    label,
    tooltip,
  }: {
    htmlFor: string;
    label: string;
    tooltip: string;
  }) => (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
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

  if (!user) {
    return null;
  }

  if (venueLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading venue...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Venue not found</p>
            <Button
              onClick={() => router.push("/my-venues")}
              className="mt-4"
              data-testid="button-back-to-venues"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Venues
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Edit {venue.name} - BowlingAlleys.io</title>
        <meta
          name="description"
          content={`Edit venue details for ${venue.name}`}
        />
      </Helmet>

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <Link href="/my-venues">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                data-testid="button-back-to-my-venues"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to My Venues
              </Button>
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{venue.name}</h1>
            <p className="text-muted-foreground">
              {venue.city}, {venue.state}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tabs */}
            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className={`grid w-full ${venue.isFoundingPartner ? 'grid-cols-6' : 'grid-cols-5'} h-auto bg-muted`}>
                <TabsTrigger
                  value="info"
                  data-testid="tab-venue-info"
                  className="text-sm font-semibold py-3"
                >
                  Venue Info
                </TabsTrigger>
                <TabsTrigger
                  value="hours"
                  data-testid="tab-venue-hours"
                  className="text-sm font-semibold py-3"
                >
                  Hours
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  data-testid="tab-venue-pricing"
                  className="text-sm font-semibold py-3"
                >
                  Pricing
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  data-testid="tab-customer-reviews"
                  className="text-sm font-semibold py-3"
                >
                  Reviews ({venue.reviewCount || 0})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Venue Info */}
              <TabsContent value="info" className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="name"
                          label="Name *"
                          tooltip="The official name of your bowling center"
                        />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Strike Zone Lanes"
                          required
                          data-testid="input-venue-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="lanes"
                          label="Number of Lanes *"
                          tooltip="Total number of bowling lanes in your facility"
                        />
                        <Input
                          id="lanes"
                          type="number"
                          min="1"
                          value={formData.lanes}
                          onChange={(e) =>
                            handleInputChange("lanes", parseInt(e.target.value) || 1)
                          }
                          required
                          data-testid="input-venue-lanes"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <LabelWithTooltip
                        htmlFor="description"
                        label="Description"
                        tooltip="Describe what makes your bowling alley special"
                      />
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Family-friendly bowling center with state-of-the-art lanes..."
                        rows={4}
                        data-testid="input-venue-description"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Amenities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Important:</strong> Please follow the amenities you see on other venues in our directory. We analyze all amenities daily for SEO value and only display those that help customers find your venue through search engines.
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                        <strong>Examples:</strong> Arcade, Bar & Grill, Pro Shop, Cosmic Bowling, League Play, Birthday Parties, Food & Drinks, Lounge, Party Rooms, Bumper Bowling, Billiards
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type amenity and press Enter..."
                        data-testid="input-new-amenity"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addAmenity}
                        data-testid="button-add-amenity"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[60px]">
                      {formData.amenities.map((amenity: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="gap-1"
                          data-testid={`badge-amenity-${index}`}
                        >
                          {amenity}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeAmenity(amenity)}
                            data-testid={`button-remove-amenity-${index}`}
                          />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Address, Contact & Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address, Contact & Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <LabelWithTooltip
                        htmlFor="address"
                        label="Street Address"
                        tooltip="Your venue's physical address. This field is managed by our team to ensure accuracy"
                      />
                      <Input
                        id="address"
                        value={formData.address}
                        disabled
                        className="bg-muted"
                        data-testid="input-venue-address"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          disabled
                          className="bg-muted"
                          data-testid="input-venue-city"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          disabled
                          className="bg-muted"
                          data-testid="input-venue-state"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          value={formData.zipCode}
                          disabled
                          className="bg-muted"
                          data-testid="input-venue-zipcode"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="phone"
                          label="Phone"
                          tooltip="Your venue's main contact phone number"
                        />
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange("phone", e.target.value)}
                            placeholder="(555) 123-4567"
                            data-testid="input-venue-phone"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="email"
                          label="Email"
                          tooltip="Your venue's contact email address"
                        />
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            placeholder="info@yourbowl.com"
                            data-testid="input-venue-email"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="website"
                          label="Website"
                          tooltip="Your venue's official website URL"
                        />
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="website"
                            value={formData.website}
                            onChange={(e) => handleInputChange("website", e.target.value)}
                            placeholder="https://yourbowl.com"
                            data-testid="input-venue-website"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="facebookUrl"
                          label="Facebook URL"
                          tooltip="Your venue's Facebook page URL"
                        />
                        <div className="flex items-center gap-2">
                          <SiFacebook className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="facebookUrl"
                            value={formData.facebookUrl}
                            onChange={(e) => handleInputChange("facebookUrl", e.target.value)}
                            placeholder="https://facebook.com/yourbowlingalley"
                            data-testid="input-venue-facebook"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="instagramUrl"
                          label="Instagram URL"
                          tooltip="Your venue's Instagram profile URL"
                        />
                        <div className="flex items-center gap-2">
                          <SiInstagram className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="instagramUrl"
                            value={formData.instagramUrl}
                            onChange={(e) => handleInputChange("instagramUrl", e.target.value)}
                            placeholder="https://instagram.com/yourbowlingalley"
                            data-testid="input-venue-instagram"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="twitterUrl"
                          label="X / Twitter URL"
                          tooltip="Your venue's X (Twitter) profile URL"
                        />
                        <div className="flex items-center gap-2">
                          <SiX className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="twitterUrl"
                            value={formData.twitterUrl}
                            onChange={(e) => handleInputChange("twitterUrl", e.target.value)}
                            placeholder="https://x.com/yourbowlingalley"
                            data-testid="input-venue-twitter"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="tikTokUrl"
                          label="TikTok URL"
                          tooltip="Your venue's TikTok profile URL"
                        />
                        <div className="flex items-center gap-2">
                          <SiTiktok className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="tikTokUrl"
                            value={formData.tikTokUrl}
                            onChange={(e) => handleInputChange("tikTokUrl", e.target.value)}
                            placeholder="https://tiktok.com/@yourbowlingalley"
                            data-testid="input-venue-tiktok"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={formData.location.latitude}
                          disabled
                          className="bg-muted"
                          data-testid="input-venue-latitude"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={formData.location.longitude}
                          disabled
                          className="bg-muted"
                          data-testid="input-venue-longitude"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Venue Hours */}
              <TabsContent value="hours" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Operating Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-1.5">
                      <p className="text-sm text-muted-foreground flex-1">
                        Enter hours in a readable format for each day. Use "Closed" for days you're not open.
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0 mt-0.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">
                            Examples: "Monday: 4:00 PM – 11:00 PM", "Saturday: 10:00 AM – 2:00 AM", or "Tuesday: Closed"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="space-y-2">
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                        <div key={index} className="space-y-1">
                          <Label htmlFor={`hours-${index}`} className="text-xs text-muted-foreground">
                            {day}
                          </Label>
                          <Input
                            id={`hours-${index}`}
                            value={formData.weekdayText[index] || ""}
                            onChange={(e) => {
                              const newWeekdayText = [...formData.weekdayText];
                              newWeekdayText[index] = e.target.value;
                              setFormData((prev) => ({ ...prev, weekdayText: newWeekdayText }));
                            }}
                            placeholder={`e.g., "${day}: 4:00 PM – 11:00 PM" or "Closed"`}
                            data-testid={`input-weekday-text-${index}`}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 4: Pricing */}
              <TabsContent value="pricing" className="space-y-6">
                {/* Average Pricing - Quick Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Average Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        What would a typical customer spend at your bowling alley? This gives visitors a quick estimate before seeing detailed pricing below.
                      </p>
                      <div className="bg-muted/50 border border-border rounded-md p-3">
                        <p className="text-sm text-foreground font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Pricing Tip: Use worst-case scenario pricing
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter your highest prices—typically Friday/Saturday afternoons—so customers aren't surprised. If your actual rates are lower when they visit, that's a pleasant bonus!
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="gamePrice"
                          label="Per Game ($)"
                          tooltip="Average cost per game. Example: If games range from $4-$6, enter $5"
                        />
                        <Input
                          id="gamePrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.pricing.game}
                          onChange={(e) =>
                            handleNestedChange("pricing", "game", parseFloat(e.target.value) || 0)
                          }
                          placeholder="5.00"
                          data-testid="input-price-game"
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="hourlyPrice"
                          label="Per Hour ($)"
                          tooltip="Average hourly rate per lane. Example: If hourly rates range from $35-$45, enter $40"
                        />
                        <Input
                          id="hourlyPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.pricing.hourly}
                          onChange={(e) =>
                            handleNestedChange("pricing", "hourly", parseFloat(e.target.value) || 0)
                          }
                          placeholder="40.00"
                          data-testid="input-price-hourly"
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="shoeRental"
                          label="Shoe Rental ($)"
                          tooltip="Average shoe rental price. Example: If shoes cost $4-$6 depending on size, enter $5"
                        />
                        <Input
                          id="shoeRental"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.pricing.shoeRental}
                          onChange={(e) =>
                            handleNestedChange("pricing", "shoeRental", parseFloat(e.target.value) || 0)
                          }
                          placeholder="5.00"
                          data-testid="input-price-shoes"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 4: Customer Reviews */}
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Reviews</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reviewsLoading ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Loading reviews...
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No customer reviews yet</p>
                        <p className="text-sm mt-2">
                          Reviews from customers will appear here
                        </p>
                      </div>
                    ) : (
                      <>
                        {venue.avgRating && (
                          <div className="flex items-center gap-2 mb-4 p-4 bg-muted/50 rounded-lg">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-lg">
                              {venue.avgRating.toFixed(1)}
                            </span>
                            <span className="text-muted-foreground">
                              · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}

                        {reviews.map((review: Review) => (
                          <div
                            key={review.id}
                            data-testid={`review-card-${review.id}`}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={review.userPhotoURL} />
                                  <AvatarFallback>
                                    {review.userDisplayName?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">{review.userDisplayName}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${
                                            i < review.rating
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "text-gray-300 dark:text-gray-600"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {(() => {
                                        if (!review.createdAt) return null;
                                        const raw = review.createdAt;
                                        const d =
                                          typeof raw.toDate === "function"
                                            ? raw.toDate()
                                            : raw instanceof Date
                                              ? raw
                                              : new Date(raw as string | number);
                                        if (Number.isNaN(d.getTime())) return null;
                                        return formatDistanceToNow(d, { addSuffix: true });
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {review.text && (
                              <p className="text-sm text-muted-foreground">
                                {review.text}
                              </p>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>

            <Separator />

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/my-venues")}
                disabled={updateVenueMutation.isPending}
                data-testid="button-cancel-venue-form"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateVenueMutation.isPending}
                data-testid="button-submit-venue-form"
              >
                {updateVenueMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>

          {/* Pricing Period Drawer */}
          <PricingPeriodDrawer
            period={editingPeriod}
            isOpen={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
              setEditingPeriod(null);
            }}
            onSave={handleSavePeriod}
            periodNumber={
              editingPeriod
                ? formData.pricingDetails.periods.findIndex(p => p.id === editingPeriod.id) + 1
                : undefined
            }
          />
        </div>
      </div>

    </div>
  );
}
