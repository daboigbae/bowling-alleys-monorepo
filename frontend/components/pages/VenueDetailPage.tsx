'use client';

import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  DollarSign,
  Gamepad2,
  HelpCircle,
  Send,
  Copy,
  Check,
  CheckCircle,
  Bookmark,
  Share2,
  MessageSquare,
  Code,
  Star,
  Tag,
  Building2,
  Calendar,
  ExternalLink,
  Users,
  Briefcase,
  PartyPopper,
  Beer,
  Sparkles,
  Trophy,
  Accessibility,
  Moon,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";
const baioLogo = "/attached_assets/Main_Logo_1767046875251.webp";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import StarRating from "@/components/StarRating";

import { PricingDisplay } from "@/components/PricingDisplay";
import {
  getVenue,
  getUserProfile,
  isAlleySaved,
  addSavedAlley,
  removeSavedAlley,
  getSuggestionByVenueId,
  type Venue,
} from "@/lib/firestore";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { getCityHubUrl } from "@/lib/cityHubMap";
import { useQueryClient } from "@tanstack/react-query";

// Lazy load heavy components to improve initial page load
const ReviewList = lazy(() => import("@/components/ReviewList"));
const PeopleAlsoViewed = lazy(() => import("@/components/PeopleAlsoViewed"));
const RelatedBlogPosts = lazy(() => import("@/components/RelatedBlogPosts"));
const AuthModal = lazy(() => import("@/components/AuthModal"));
const ReviewForm = lazy(() => import("@/components/ReviewForm"));

// Helper function to format phone numbers
const formatPhoneNumber = (phone: string) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return amount.toFixed(2);
};

// Helper function to format location names for URLs
const formatLocationForUrl = (location: string) => {
  return location.replace(/\s+/g, "-");
};

// Helper function to check if venue is open past midnight on weekends (Late Night)
const isLateNightVenue = (venue: any) => {
  if (!venue.periods || !Array.isArray(venue.periods)) return false;

  // Check each period to see if it closes past midnight on Friday or Saturday nights
  return venue.periods.some((period: any) => {
    const openDay = period.open?.day;
    const closeDay = period.close?.day;
    const closeTime = period.close?.time;

    // Friday night (opens day 5, closes day 6 after midnight)
    if (openDay === 5 && closeDay === 6 && closeTime && closeTime > "0000") {
      return true;
    }
    // Saturday night (opens day 6, closes day 0 after midnight)
    if (openDay === 6 && closeDay === 0 && closeTime && closeTime > "0000") {
      return true;
    }
    return false;
  });
};

// Helper function to get today's hours from weekdayText
const getTodayHours = (venue: any) => {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  if (venue.weekdayText && venue.weekdayText.length > 0) {
    // Find today's hours in weekdayText
    const todayText = venue.weekdayText.find((text: string) =>
      text.toLowerCase().includes(dayNames[today]),
    );
    if (todayText) {
      // Extract everything after the day name and colon
      // This handles split hours like "Monday: 9:00 AM–1:00 PM, 4:00–9:00 PM"
      const match = todayText.match(/:\s*(.+)$/);
      if (match) {
        const hours = match[1].trim();
        // Check if it says "Closed"
        if (hours.toLowerCase() === "closed") {
          return "Closed";
        }
        return hours;
      }
    }
  }

  return null;
};

// Claim form schema
const claimFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(100, "Subject must be less than 100 characters"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
});

interface VenueDetailPageProps {
  venueId: string;
  initialVenueData?: Venue | null;
}

export default function VenueDetail({ venueId, initialVenueData }: VenueDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get origin/URL safely for SSR
  const [origin, setOrigin] = useState("https://bowlingalleys.io");
  const [currentUrl, setCurrentUrl] = useState("https://bowlingalleys.io");
  const [currentPathname, setCurrentPathname] = useState("");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setCurrentUrl(window.location.href);
      setCurrentPathname(window.location.pathname);
    }
  }, []);

  // Check for webview mode (hides navigation elements for embedded app views)
  const isWebview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("webview") === "true";

  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [signupBenefitsDialogOpen, setSignupBenefitsDialogOpen] =
    useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number | string, boolean>>({});

  const claimForm = useForm<z.infer<typeof claimFormSchema>>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      email: user?.email || "",
      subject: "",
      message: "",
    },
  });

  // Check if user came from locations using sessionStorage (client-only)
  const getBackPath = () => {
    if (typeof window === "undefined") return null;
    const storedPath = sessionStorage.getItem("venueBackPath");

    if (storedPath && storedPath.startsWith("/locations")) {
      return storedPath;
    }

    return null;
  };

  const backPath = getBackPath();
  const showBackButton = backPath !== null;

  // Clear the stored path when component unmounts or when navigating away
  useEffect(() => {
    return () => {
      // Only clear if we're navigating back (not just refreshing)
      if (backPath) {
        sessionStorage.removeItem("venueBackPath");
      }
    };
  }, [backPath]);

  // Fetch venue (uses client cache for fewer reads; changes may take up to 24h to appear)
  const {
    data: venue,
    isLoading,
    error,
    refetch: refetchVenue,
  } = useQuery({
    queryKey: ["venue", venueId],
    queryFn: () => getVenue(venueId!),
    enabled: !!venueId,
    initialData: initialVenueData !== undefined ? initialVenueData : undefined,
  });

  // Fetch owner profile if venue has ownerId
  const { data: owner } = useQuery({
    queryKey: ["owner", venue?.ownerId],
    queryFn: () => getUserProfile(venue!.ownerId!),
    enabled: !!venue?.ownerId,
  });

  // Check if alley is saved
  const { data: isSaved = false } = useQuery({
    queryKey: ["savedAlley", venueId, user?.uid],
    queryFn: () => isAlleySaved(user!.uid, venueId!),
    enabled: !!venueId && !!user,
  });

  // Fetch suggestion that led to this venue being added
  const { data: venueSuggestion } = useQuery({
    queryKey: ["venueSuggestion", venueId],
    queryFn: () => getSuggestionByVenueId(venueId!),
    enabled: !!venueId,
  });

  // Get the discoverer's user ID (could be in assignedUserId or userId)
  const discovererId =
    venueSuggestion?.assignedUserId || venueSuggestion?.userId;

  // Fetch discoverer's profile for proper profile link
  const { data: suggesterProfile } = useQuery({
    queryKey: ["suggesterProfile", discovererId],
    queryFn: () => getUserProfile(discovererId!),
    enabled: !!discovererId,
  });

  // Toggle saved alley mutation
  const toggleSavedMutation = useMutation({
    mutationFn: async () => {
      if (!user || !venueId) throw new Error("User not authenticated");

      if (isSaved) {
        await removeSavedAlley(user.uid, venueId);
        return false;
      } else {
        await addSavedAlley(user.uid, venueId);
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["savedAlley", venueId, user?.uid],
      });
      queryClient.invalidateQueries({ queryKey: ["savedAlleys", user?.uid] });
      toast({
        title: isSaved ? "Removed from saved" : "Saved!",
        description: isSaved
          ? "This alley has been removed from your saved list"
          : "This alley has been saved to your list",
      });
    },
    onError: (error) => {
      console.error("Error saving alley:", error);
      toast({
        title: "Error",
        description: "Failed to save alley. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleSaved = () => {
    if (!user) {
      setAuthMode("signin");
      setAuthModalOpen(true);
      return;
    }
    trackEvent(
      isSaved ? "unsave_venue" : "save_venue",
      "engagement",
      venue?.name,
    );
    toggleSavedMutation.mutate();
  };

  // Track venue page view
  useEffect(() => {
    if (venue) {
      trackEvent("venue_view", "engagement", venue.name, venue.avgRating);
    }
  }, [venue]);

  // Autofill email when user is logged in
  useEffect(() => {
    if (user?.email) {
      claimForm.setValue("email", user.email);
    }
  }, [user, claimForm]);

  // Autofill subject and message when venue is loaded
  useEffect(() => {
    if (venue) {
      claimForm.setValue("subject", `Claim request for ${venue.name}`);
      claimForm.setValue(
        "message",
        `I am the owner or authorized representative of ${venue.name} located at ${venue.address}, ${venue.city}, ${venue.state}. I would like to claim this listing to manage and update the venue information.`,
      );
    }
  }, [venue, claimForm]);

  // Track carousel slide changes
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };

    carouselApi.on("select", onSelect);
    onSelect(); // Set initial slide

    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Set SEO meta tags
  useEffect(() => {
    if (!venue) return;

    // --- Location & year
    const loc = [venue.city, venue.state].filter(Boolean).join(", ");
    const year = new Date().getFullYear();

    // --- Title: Use custom seoTitle if available, otherwise generate default
    let title;
    if ((venue as any).seoTitle) {
      title = (venue as any).seoTitle;
    } else {
      const baseTitle = loc
        ? `${venue.name} – ${loc} Reviews & Prices (${year})`
        : `${venue.name} Reviews & Prices (${year}) | BowlingAlleys.io`;
      title =
        baseTitle.length > 60
          ? `${venue.name} – ${loc} Bowling (${year})`
          : baseTitle;
    }

    // --- Meta description for JSON-LD (≤ ~155, no leading spaces)
    const ratingBits =
      venue.avgRating > 0 ? `${venue.avgRating.toFixed(1)}★ · ` : "";
    const reviewBits =
      venue.reviewCount > 0
        ? ` • ${venue.reviewCount} review${venue.reviewCount === 1 ? "" : "s"}`
        : "";
    let desc = `${ratingBits}${venue.name}${loc ? ` in ${loc}` : ""}: prices, hours, shoe rental, leagues, cosmic & directions. Plan with BowlingAlleys.io${reviewBits}.`;
    if (desc.length > 155)
      desc = desc.slice(0, 152).replace(/\s+\S*$/, "") + "…";

    const canonicalHref = origin + currentPathname;

    // --- Opening hours → schema
    const createOpeningHours = () => {
      if (!venue.hours) return undefined;
      const dayEnum: Record<string, string> = {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday",
      };
      const specs: any[] = [];
      Object.entries(venue.hours).forEach(([day, hours]: any) => {
        if (hours?.open && hours?.close && dayEnum[day]) {
          specs.push({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: dayEnum[day],
            opens: hours.open, // "10:00"
            closes: hours.close, // "23:00"
          });
        }
      });
      return specs.length ? specs : undefined;
    };

    // --- Price range from MIN known price
    const getPriceRange = () => {
      const prices: number[] = [];
      const hourly = Number(venue.pricing?.hourly);
      const game = Number(venue.pricing?.game);
      if (!Number.isNaN(hourly)) prices.push(hourly);
      if (!Number.isNaN(game)) prices.push(game);
      const min = prices.length ? Math.min(...prices) : undefined;
      if (min == null) return "$$";
      if (min < 15) return "$";
      if (min < 30) return "$$";
      if (min < 50) return "$$$";
      return "$$$$";
    };

    // --- JSON-LD (use BowlingAlley, clean url, move external site to sameAs)
    const ld: any = {
      "@context": "https://schema.org",
      "@type": "BowlingAlley",
      name: venue.name,
      description: desc,
      url: canonicalHref,
      ...(venue.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: venue.address,
          ...(venue.city && { addressLocality: venue.city }),
          ...(venue.state && { addressRegion: venue.state }),
          ...(venue.zipCode && { postalCode: venue.zipCode }),
        },
      }),
      ...(venue.phone && { telephone: venue.phone }),
      ...(venue.website && { sameAs: [venue.website] }),
      ...(venue.location?.latitude &&
        venue.location?.longitude && {
          geo: {
            "@type": "GeoCoordinates",
            latitude: venue.location.latitude,
            longitude: venue.location.longitude,
          },
        }),
      ...(createOpeningHours() && {
        openingHoursSpecification: createOpeningHours(),
      }),
      priceRange: getPriceRange(),
      ...(venue.amenities?.length && {
        amenityFeature: venue.amenities.map((name: string) => ({
          "@type": "LocationFeatureSpecification",
          name,
        })),
      }),
    };

    // Only include ratings if you actually render ratings on the page
    if (venue.avgRating > 0 && venue.reviewCount > 0) {
      ld.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(venue.avgRating.toFixed(1)),
        reviewCount: venue.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    // --- Replace existing LD+JSON
    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-venue]',
    );
    if (existingScript) existingScript.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-venue", "true");
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }, [venue]);

  // Add FAQPage JSON-LD schema for Google rich snippets
  useEffect(() => {
    if (!venue) return;

    const faqItems = [];

    // Cost to Bowl FAQ (always shown)
    const costAnswer = (() => {
      if (
        Number(venue.pricing?.game ?? 0) > 0 ||
        Number(venue.pricing?.hourly ?? 0) > 0
      ) {
        let answer = "";
        if (Number(venue.pricing?.game ?? 0) > 0) {
          answer += `Games are $${formatCurrency(Number(venue.pricing?.game ?? 0))} per game${venue.isFranchise ? " (starting price)" : ""}.`;
          if (Number(venue.pricing?.hourly ?? 0) > 0) answer += " ";
        }
        if (Number(venue.pricing?.hourly ?? 0) > 0) {
          answer += `Hourly bowling is $${formatCurrency(Number(venue.pricing?.hourly ?? 0))} per hour${venue.isFranchise ? " (starting price)" : ""}.`;
        }
        answer += venue.isFranchise
          ? " Pricing may vary by location."
          : " Call ahead to confirm current rates.";
        return answer;
      } else if (venue.phone) {
        return `Pricing information is not available online. Please call ${formatPhoneNumber(venue.phone)} for current bowling rates at ${venue.name} in ${venue.city}, ${venue.state}.`;
      } else if (venue.website) {
        return `Pricing information is not available here. Please visit their website for current bowling rates at ${venue.name} in ${venue.city}, ${venue.state}.`;
      } else {
        return `Pricing information is not currently available. Contact ${venue.name} in ${venue.city}, ${venue.state} directly for current rates.`;
      }
    })();

    faqItems.push({
      "@type": "Question",
      name: `How much does it cost to bowl at ${venue.name}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: costAnswer,
      },
    });

    // Shoe Rental FAQ (always shown)
    const shoeAnswer = (() => {
      if (Number(venue.pricing?.shoeRental ?? 0) > 0) {
        return `Shoe rental is $${formatCurrency(Number(venue.pricing?.shoeRental ?? 0))} per pair${venue.isFranchise ? " (starting price)" : ""}. ${venue.isFranchise ? "Pricing may vary by location." : "Call ahead to confirm current rates."}`;
      } else if (venue.phone) {
        return `Shoe rental pricing is not available online. Please call ${formatPhoneNumber(venue.phone)} for current shoe rental rates at ${venue.name}.`;
      } else if (venue.website) {
        return `Shoe rental pricing is not available here. Please visit their website for current shoe rental rates at ${venue.name}.`;
      } else {
        return `Shoe rental pricing is not currently available. Contact ${venue.name} directly for current rates.`;
      }
    })();

    faqItems.push({
      "@type": "Question",
      name: `How much do bowling shoes cost at ${venue.name}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: shoeAnswer,
      },
    });

    // Special Events FAQ (always shown)
    const eventsAnswer = (() => {
      if (venue.amenities && venue.amenities.length > 0) {
        let answer = "";
        if (
          (venue.amenities.includes("🏆 Leagues") ||
            venue.amenities.includes("Leagues")) &&
          venue.amenities.includes("Cosmic Bowling")
        ) {
          answer = `Yes! ${venue.name} in ${venue.city}, ${venue.state} offers both league bowling and cosmic bowling events.`;
        } else if (
          venue.amenities.includes("🏆 Leagues") ||
          venue.amenities.includes("Leagues")
        ) {
          answer = `Yes! ${venue.name} in ${venue.city}, ${venue.state} offers league bowling for competitive players.`;
        } else if (
          venue.amenities.includes("Cosmic Bowling") ||
          venue.amenities.includes("Glow Bowling")
        ) {
          answer = `Yes! ${venue.name} in ${venue.city}, ${venue.state} offers cosmic/glow bowling events with special lighting and music.`;
        } else {
          answer = `Based on available information, special events are not specifically listed for ${venue.name} in ${venue.city}, ${venue.state}.`;
        }
        if (venue.phone) {
          answer += ` Call ${formatPhoneNumber(venue.phone)} for current schedules and event details.`;
        }
        return answer;
      } else if (venue.phone) {
        return `Information about special events is not available online. Please call ${formatPhoneNumber(venue.phone)} to ask about cosmic nights, league bowling, and other special events at ${venue.name} in ${venue.city}, ${venue.state}.`;
      } else if (venue.website) {
        return `Information about special events is not available here. Please visit their website to learn about cosmic nights, league bowling, and other special events at ${venue.name} in ${venue.city}, ${venue.state}.`;
      } else {
        return `Information about special events is not currently available. Contact ${venue.name} in ${venue.city}, ${venue.state} directly to ask about cosmic nights, league bowling, and other events.`;
      }
    })();

    faqItems.push({
      "@type": "Question",
      name: `Do they have any special events like cosmic nights or league nights at ${venue.name}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: eventsAnswer,
      },
    });

    // Party Hosting FAQ (only if venue has party amenities)
    if (
      venue.amenities &&
      (venue.amenities.includes("Party Packages") ||
        venue.amenities.includes("Private Events") ||
        venue.amenities.includes("Birthday Parties") ||
        venue.amenities.includes("Parties"))
    ) {
      const partyAnswer = `Yes! ${venue.name} in ${venue.city}, ${venue.state} offers party packages and private events.${venue.phone ? ` Call ${formatPhoneNumber(venue.phone)} to book your party and discuss package options.` : ""}`;

      faqItems.push({
        "@type": "Question",
        name: `Does ${venue.name} host parties?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: partyAnswer,
        },
      });
    }

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems,
    };

    // Remove any existing FAQ schema
    const existingFaqScript = document.querySelector("script[data-faq-schema]");
    if (existingFaqScript) {
      existingFaqScript.remove();
    }

    // Add new FAQ schema
    const faqScript = document.createElement("script");
    faqScript.type = "application/ld+json";
    faqScript.setAttribute("data-faq-schema", "true");
    faqScript.textContent = JSON.stringify(faqSchema, null, 2);
    document.head.appendChild(faqScript);

    // Cleanup function to remove script when component unmounts
    return () => {
      const schemaScript = document.querySelector("script[data-faq-schema]");
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, [venue]);

  const handleWriteReview = () => {
    // Track review button click
    trackEvent("review_button_click", "engagement", venue?.name);

    if (!user) {
      setAuthMode("signin");
      setAuthModalOpen(true);
    } else {
      setReviewFormOpen(true);
    }
  };

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      // Fallback to general locations if no specific path
      router.push("/locations");
    }
  };

  const handleShareFacebook = () => {
    const url = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
    trackEvent("share_facebook", "social", venue?.name);
  };

  const handleShareTwitter = () => {
    const url = window.location.href;
    const text = `Check out ${venue?.name} on BowlingAlleys.io!`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
    trackEvent("share_twitter", "social", venue?.name);
  };

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    const text = `Check out ${venue?.name} on BowlingAlleys.io! ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    trackEvent("share_whatsapp", "social", venue?.name);
  };

  const handleShareSMS = () => {
    const url = window.location.href;
    const text = `Check out ${venue?.name} on BowlingAlleys.io! ${url}`;
    const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    trackEvent("share_sms", "social", venue?.name);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      trackEvent("copy_link", "social", venue?.name);
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
          <Card className="p-8 mb-8">
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-destructive">Venue not found.</p>
          {showBackButton && (
            <Button onClick={handleBack} className="mt-4">
              Back to Results
            </Button>
          )}
        </div>
      </div>
    );
  }

  const fullAddress = `${venue.address}, ${venue.city}, ${venue.state} ${venue.zipCode}`;
  const googleMapsUrl = venue.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}&query_place_id=${venue.googlePlaceId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ", " + fullAddress)}`;

  // Handle claim form submission
  const onClaimSubmit = async (values: z.infer<typeof claimFormSchema>) => {
    setIsSubmittingClaim(true);
    try {
      const data = await api.post("/api/contact", {
        email: values.email,
        subject: values.subject,
        message: values.message,
        type: "claim-venue",
        venueId: venue.id,
        venueName: venue.name,
      });

      toast({
        title: "Claim request sent successfully!",
        description: `Your claim request has been received. Reference ID: ${data.contactId.slice(0, 8)}`,
      });

      claimForm.reset();

      // Delay closing dialog to ensure toast renders and is visible
      setTimeout(() => {
        setClaimDialogOpen(false);
      }, 500);
    } catch (error) {
      console.error("Claim form submission error:", error);
      toast({
        title: "Failed to send claim request",
        description:
          error instanceof Error
            ? error.message
            : "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Generate metadata for Helmet
  const loc = venue ? [venue.city, venue.state].filter(Boolean).join(", ") : "";
  const year = new Date().getFullYear();

  let pageTitle = `Bowling Alley – Reviews & Prices (${year}) | BowlingAlleys.io`;
  let pageDescription =
    "Find bowling alley information, reviews, pricing, hours, and directions.";
  let ogImage = `${origin}/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg`;

  if (venue) {
    // Title
    if ((venue as any).seoTitle) {
      pageTitle = (venue as any).seoTitle;
    } else {
      const baseTitle = loc
        ? `${venue.name} – ${loc} Reviews & Prices (${year})`
        : `${venue.name} Reviews & Prices (${year}) | BowlingAlleys.io`;
      pageTitle =
        baseTitle.length > 60
          ? `${venue.name} – ${loc} Bowling (${year})`
          : baseTitle;
    }

    // Description
    const ratingBits =
      venue.avgRating > 0 ? `${venue.avgRating.toFixed(1)}★ · ` : "";
    const reviewBits =
      venue.reviewCount > 0
        ? ` • ${venue.reviewCount} review${venue.reviewCount === 1 ? "" : "s"}`
        : "";
    let desc = `${ratingBits}${venue.name}${loc ? ` in ${loc}` : ""}: prices, hours, shoe rental, leagues, cosmic & directions. Plan with BowlingAlleys.io${reviewBits}.`;
    if (desc.length > 155) {
      desc = desc.slice(0, 152).replace(/\s+\S*$/, "") + "…";
    }
    pageDescription = desc;

    // Use venue's first image if available (prioritize imageUrls, fallback to coverImageUrl)
    const imageUrls = (venue as any).imageUrls;
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      ogImage = imageUrls[0];
    } else if ((venue as any).coverImageUrl) {
      ogImage = (venue as any).coverImageUrl;
    }
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link
          rel="canonical"
          href={origin + currentPathname}
        />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:site_name" content="BowlingAlleys.io" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta
          property="og:image:alt"
          content={venue ? `${venue.name} bowling alley` : "Bowling alley"}
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta
          name="twitter:image:alt"
          content={venue ? `${venue.name} bowling alley` : "Bowling alley"}
        />
      </Helmet>

      {/* Signup Benefits Dialog - For non-authenticated users */}
      <Dialog
        open={signupBenefitsDialogOpen}
        onOpenChange={setSignupBenefitsDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sign Up to Claim Your Bowling Alley</DialogTitle>
            <DialogDescription>
              Create a free account to claim and manage {venue?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Verification Speed Section */}
            <div className="space-y-3 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                How Fast Can You Get Verified?
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 font-semibold text-green-700 dark:text-green-400">
                    Instantly
                  </div>
                  <div>
                    Sign up with an email address that uses your venue's website
                    domain
                    {venue?.website && (
                      <span className="text-muted-foreground">
                        {" "}
                        (e.g., owner@
                        {new URL(venue.website).hostname.replace("www.", "")})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 font-semibold text-blue-700 dark:text-blue-400">
                    1-2 days
                  </div>
                  <div>
                    Sign up with an email address that's publicly listed on your
                    venue's website
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 font-semibold text-orange-700 dark:text-orange-400">
                    5-7 days
                  </div>
                  <div>
                    Sign up with any other email (requires manual verification)
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                Benefits of Claiming Your Alley:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Update your information</strong> - Keep hours,
                    pricing, and contact details current
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Add photos</strong> - Showcase your lanes, arcade,
                    and amenities
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Highlight amenities</strong> - Promote your arcade,
                    cosmic bowling, bar, pro shop, and more
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Increase visibility</strong> - Verified listings
                    rank higher in search results
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>100% free</strong> - No fees, no gimmicks, just
                    better exposure
                  </span>
                </li>
              </ul>
              <div className="pt-2">
                <a
                  href="/owner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all owner benefits and partnership program →
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setSignupBenefitsDialogOpen(false);
                  setAuthMode("signup");
                  setAuthModalOpen(true);
                }}
                className="w-full"
                size="lg"
                data-testid="button-signup-to-claim"
              >
                Sign Up to Claim This Alley
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSignupBenefitsDialogOpen(false);
                  setAuthMode("signin");
                  setAuthModalOpen(true);
                }}
                className="w-full"
                data-testid="button-signin-to-claim"
              >
                Already Have an Account? Sign In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim Form Dialog - For authenticated users */}
      {user && (
        <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Claim This Bowling Alley</DialogTitle>
              <DialogDescription>
                Are you the owner or manager of {venue?.name}? We'll send your
                claim request to our team and get back to you within 24-48
                hours.
              </DialogDescription>
            </DialogHeader>
            <Form {...claimForm}>
              <form
                onSubmit={claimForm.handleSubmit(onClaimSubmit)}
                className="space-y-4"
              >
                {/* Hidden fields - auto-populated and submitted without user visibility */}
                <input type="hidden" {...claimForm.register("email")} />
                <input type="hidden" {...claimForm.register("subject")} />

                <FormField
                  control={claimForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Details (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional details about your ownership or management role..."
                          className="min-h-[120px]"
                          data-testid="input-claim-message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="w-full"
                  data-testid="button-submit-claim"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmittingClaim ? "Submitting..." : "Submit Claim Request"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button - Only show if user came from locations */}
        {showBackButton && (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Results
          </Button>
        )}

        {/* Breadcrumb Navigation - Hidden in webview */}
        {!isWebview && (
          <Breadcrumb className="mb-6" data-testid="breadcrumb-navigation">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/locations" data-testid="link-breadcrumb-home">
                    All Bowling alleys
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={`/locations/${formatLocationForUrl(venue.state)}`}
                    data-testid="link-breadcrumb-state"
                  >
                    {venue.state}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={`/locations/${formatLocationForUrl(venue.state)}/${formatLocationForUrl(venue.city)}`}
                    data-testid="link-breadcrumb-city"
                  >
                    {venue.city}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="text-breadcrumb-venue">
                  {venue.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Venue Header */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            <div className="mb-4 lg:mb-0">
              {/* 1. Identity - Venue Name */}
              <h1
                className="text-3xl font-bold text-foreground mb-2"
                data-testid="text-venue-name"
              >
                {venue.name}
              </h1>

              {/* 2. Primary Decision Fact - Pricing & Hours */}
              {(() => {
                const parts = [];

                // Pricing - prioritize hourly, fall back to per game
                if (venue.pricing?.hourly) {
                  const hourly =
                    typeof venue.pricing.hourly === "number"
                      ? Math.round(venue.pricing.hourly)
                      : venue.pricing.hourly;
                  parts.push(`Bowling: from $${hourly}/hr (peak)`);
                } else if (venue.pricing?.game) {
                  const price =
                    typeof venue.pricing.game === "number"
                      ? Math.round(venue.pricing.game)
                      : venue.pricing.game;
                  parts.push(`Bowling: from $${price}/game (peak)`);
                }

                // Shoe rental
                if (venue.pricing?.shoeRental) {
                  const shoes =
                    typeof venue.pricing.shoeRental === "number"
                      ? Math.round(venue.pricing.shoeRental)
                      : venue.pricing.shoeRental;
                  parts.push(`Shoes: ~$${shoes}`);
                }

                // Hours
                const todayHours = getTodayHours(venue);
                if (todayHours) {
                  parts.push(`Hours: ${todayHours}`);
                }

                return parts.length > 0 ? (
                  <p
                    className="text-base text-foreground mb-2"
                    data-testid="text-venue-quick-info"
                  >
                    {parts.join(" • ")}
                  </p>
                ) : null;
              })()}

              {/* 3. Trust Reinforcement - Verified/Updated */}
              <div className="flex items-center flex-wrap gap-2 mb-3 text-sm text-muted-foreground">
                {!isWebview &&
                  (venueSuggestion?.status === "implemented" &&
                  discovererId &&
                  suggesterProfile?.slug ? (
                    <Link
                      href={`/u/${suggesterProfile.slug}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-full hover-elevate transition-colors"
                      data-testid="pill-discovered-by-user"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Discovered by{" "}
                        {suggesterProfile.displayName ||
                          venueSuggestion?.assignedUserName}
                      </span>
                    </Link>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border-2 border-[#d52231] bg-white"
                      data-testid="pill-verified-by-team"
                    >
                      <span className="text-xs font-medium text-[#8d1914]">
                        Info verified by
                      </span>
                      <img src={baioLogo} alt="BAiO" className="h-4 w-auto" />
                    </div>
                  ))}
                {venue.updatedAt && (() => {
                  try {
                    let date: Date;
                    if (venue.updatedAt.toDate) {
                      date = venue.updatedAt.toDate();
                    } else if (venue.updatedAt.seconds) {
                      date = new Date(venue.updatedAt.seconds * 1000);
                    } else if (venue.updatedAt._seconds) {
                      date = new Date(venue.updatedAt._seconds * 1000);
                    } else {
                      date = new Date(venue.updatedAt);
                    }
                    if (isNaN(date.getTime())) return null;
                    return (
                      <span data-testid="text-last-updated">
                        • Updated {formatDistanceToNow(date, { addSuffix: false })} ago
                      </span>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>

              {/* 4. Capabilities - Feature Badges */}
              <div className="flex items-center flex-wrap gap-2 mb-3">
                {venue.lanes > 1 && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-venue-lanes"
                  >
                    {venue.lanes} lanes
                  </Badge>
                )}
                {venue.amenities &&
                  (venue.amenities.includes("🏆 Leagues") ||
                    venue.amenities.includes("Leagues")) && (
                    <Badge
                      variant="outline"
                      className="rounded-full flex items-center gap-1 border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                      data-testid="badge-leagues"
                    >
                      <Trophy className="w-3 h-3" />
                      Leagues
                    </Badge>
                  )}
                {venue.amenities &&
                  (venue.amenities.includes("Glow Bowling") ||
                    venue.amenities.includes("Cosmic Bowling")) && (
                    <Badge
                      variant="outline"
                      className="rounded-full flex items-center gap-1 border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                      data-testid="badge-cosmic-bowling"
                    >
                      <Sparkles className="w-3 h-3" />
                      Cosmic
                    </Badge>
                  )}
                {venue.amenities && venue.amenities.includes("Bar") && (
                  <Badge
                    variant="outline"
                    className="rounded-full flex items-center gap-1 border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-bar"
                  >
                    <Beer className="w-3 h-3" />
                    Bar
                  </Badge>
                )}
                {venue.amenities && venue.amenities.includes("Parties") && (
                  <Badge
                    variant="outline"
                    className="rounded-full flex items-center gap-1 border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-parties"
                  >
                    <PartyPopper className="w-3 h-3" />
                    Parties
                  </Badge>
                )}
                {venue.specialsUrl && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-specials"
                  >
                    Specials
                  </Badge>
                )}
                {isLateNightVenue(venue) && (
                  <Badge
                    variant="outline"
                    className="rounded-full flex items-center gap-1 border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-late-night"
                  >
                    <Moon className="w-3 h-3" />
                    Open Late
                  </Badge>
                )}
                {venue.amenities &&
                  venue.amenities.includes("Wheelchair Accessible") && (
                    <Badge
                      variant="outline"
                      className="rounded-full flex items-center gap-1 border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                      data-testid="badge-wheelchair"
                    >
                      <Accessibility className="w-3 h-3" />
                      Accessible
                    </Badge>
                  )}
                {(venue as any).reservationsUrl && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-reservations"
                  >
                    Reservations
                  </Badge>
                )}
                {(venue as any).corporateEventsUrl && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-2 border-[#0D3149] text-[#0D3149] dark:border-neutral-400 dark:text-neutral-300"
                    data-testid="badge-corporate-events"
                  >
                    Corporate Events
                  </Badge>
                )}
                {/* Sponsor Badge */}
                {venue.isSponsor && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    data-testid="badge-sponsor"
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Sponsor
                  </Badge>
                )}
              </div>

              {/* 5. Location - Address */}
              <p
                className="text-muted-foreground mb-2"
                data-testid="text-venue-address"
              >
                {venue.address}
                {venue.city && venue.state && (
                  <>
                    ,{" "}
                    {getCityHubUrl(venue.city) ? (
                      <Link
                        href={getCityHubUrl(venue.city)!}
                        className="text-primary hover:underline"
                        data-testid="link-city-hub"
                      >
                        {venue.city}
                      </Link>
                    ) : (
                      <span>{venue.city}</span>
                    )}
                    , {venue.state}
                  </>
                )}
                {venue.zipCode && <span> {venue.zipCode}</span>}
              </p>
            </div>
          </div>

          {/* 7. Ratings - De-emphasized */}
          <div
            className={`flex items-center space-x-4 mb-4 ${venue.reviewCount === 0 ? "opacity-50" : ""}`}
          >
            <div className="flex items-center">
              <StarRating rating={venue.avgRating || 0} size="md" />
              <span
                className="text-lg font-semibold text-foreground ml-2"
                data-testid="text-venue-rating"
              >
                {venue.avgRating ? venue.avgRating.toFixed(1) : "0.0"}
              </span>
              <span
                className="text-muted-foreground ml-2"
                data-testid="text-venue-review-count"
              >
                ({venue.reviewCount || 0} reviews)
              </span>
            </div>
          </div>

          {/* Photo Gallery */}
          {(() => {
            const imageUrls = (venue as any).imageUrls;
            const hasImages =
              imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0;

            if (hasImages) {
              return (
                <div className="relative rounded-xl overflow-hidden bg-muted/30">
                  <Carousel
                    className="w-full"
                    setApi={setCarouselApi}
                    opts={{
                      align: "start",
                      loop: true,
                    }}
                  >
                    <CarouselContent>
                      {imageUrls.map((imageUrl: string, index: number) => (
                        <CarouselItem key={index}>
                          <div className="relative aspect-[16/9] lg:aspect-[21/9]">
                            {imageErrors[index] ? (
                              <img
                                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=400"
                                alt={`${venue.name} - Image ${index + 1}`}
                                className="w-full h-full object-cover"
                                data-testid={`img-venue-photo-${index}`}
                              />
                            ) : (
                              <Image
                                src={imageUrl}
                                alt={`${venue.name} - Image ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                                className="object-cover"
                                priority={index === 0}
                                onError={() => setImageErrors((p) => ({ ...p, [index]: true }))}
                                data-testid={`img-venue-photo-${index}`}
                              />
                            )}

                            {/* Image Counter */}
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                              {currentSlide + 1} / {imageUrls.length}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>

                    {/* Navigation Arrows */}
                    <CarouselPrevious className="left-4 bg-white/90 hover:bg-white border-0 shadow-lg" />
                    <CarouselNext className="right-4 bg-white/90 hover:bg-white border-0 shadow-lg" />
                  </Carousel>

                  {/* Dot Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {imageUrls.map((_: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => carouselApi?.scrollTo(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          currentSlide === index
                            ? "bg-white w-6"
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                        data-testid={`carousel-dot-${index}`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              );
            }

            const coverSrc = venue.coverImageUrl;
            const fallbackCover =
              "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=400";
            return (
              <div className="rounded-xl overflow-hidden relative aspect-[16/9] lg:aspect-[21/9]">
                {imageErrors["cover"] || !coverSrc ? (
                  <img
                    src={fallbackCover}
                    alt={`Interior view of ${venue.name} bowling alley`}
                    className="w-full h-full object-cover"
                    data-testid="img-venue-photo"
                  />
                ) : (
                  <Image
                    src={coverSrc}
                    alt={`Interior view of ${venue.name} bowling alley`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    className="object-cover"
                    priority
                    onError={() => setImageErrors((p) => ({ ...p, cover: true }))}
                    data-testid="img-venue-photo"
                  />
                )}
              </div>
            );
          })()}
        </Card>

        {/* For Bowling Alley Owners - Claim (above Save). Hide if venue already has an owner. */}
        {!isWebview && !venue.ownerId && !(user as { ownedVenueIds?: string[] })?.ownedVenueIds?.includes(venue.id) && (
          <div className="flex items-center justify-between p-4 my-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">
                  Own or manage {venue.name}? Claim this listing to update info
                  and manage your venue page.
                </span>
                <span className="text-xs text-muted-foreground">
                  Update hours, pricing, photos, and respond to reviews.
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                trackEvent(
                  "claim_button_click",
                  "venue_owners_section",
                  venue.name,
                );
                if (user) {
                  setClaimDialogOpen(true);
                } else {
                  setAuthMode("signup");
                  setAuthModalOpen(true);
                }
              }}
              data-testid="link-claim-venue-owners-section"
            >
              Claim this alley
            </Button>
          </div>
        )}

        {/* 6. Save CTA - Commitment Moment */}
        {!isWebview && (
          <div className="flex items-center justify-between p-4 my-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Bookmark
                className={`h-5 w-5 ${isSaved ? "fill-primary text-primary" : "text-primary"}`}
              />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">
                  {isSaved
                    ? "You saved this alley. We'll notify you if anything changes."
                    : "Save this alley & get updates if anything changes."}
                </span>
                <span className="text-xs text-muted-foreground">
                  Hours, prices, leagues, and specials change more often than
                  you think.
                </span>
              </div>
            </div>
            {user ? (
              <Button
                size="sm"
                variant={isSaved ? "outline" : "default"}
                onClick={handleToggleSaved}
                disabled={toggleSavedMutation.isPending}
                data-testid="button-save-alley-section"
              >
                {isSaved ? "Saved" : "Save this alley"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  trackEvent(
                    "save_sign_up_prompt_click",
                    "engagement",
                    venue.name,
                  );
                  setAuthMode("signup");
                  setAuthModalOpen(true);
                }}
                data-testid="button-save-prompt-signup"
              >
                Save this alley
              </Button>
            )}
          </div>
        )}
        {/* About Section */}
        {venue.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p
                  className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                  data-testid="text-venue-description"
                >
                  {(() => {
                    const isLongDescription = venue.description.length > 200;
                    if (isLongDescription && !isDescriptionExpanded) {
                      return venue.description.slice(0, 200) + "...";
                    }
                    return venue.description;
                  })()}
                </p>
                {venue.description.length > 300 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                    className="mt-2 text-primary hover:text-primary/80 p-0 h-auto font-medium"
                    data-testid="button-toggle-description"
                  >
                    {isDescriptionExpanded ? "Read less" : "Read more"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Venue Information Grid */}
        <div
          className={`grid grid-cols-1 ${isWebview ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-8 mb-8`}
        >
          {/* Contact Information - Hidden in webview */}
          {!isWebview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {venue.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={`tel:${venue.phone}`}
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-phone"
                      onClick={() =>
                        trackEvent("click_to_call", "contact", venue.name)
                      }
                    >
                      {formatPhoneNumber(venue.phone)}
                    </a>
                  </div>
                )}
                {venue.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={`mailto:${venue.email}`}
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-email"
                      onClick={() =>
                        trackEvent("click_to_email", "contact", venue.name)
                      }
                    >
                      {venue.email}
                    </a>
                  </div>
                )}
                {venue.website && (
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-website"
                      onClick={() =>
                        trackEvent("outbound_to_venue", "contact", venue.name)
                      }
                    >
                      Visit Website
                    </a>
                  </div>
                )}
                {venue.facebookUrl && (
                  <div className="flex items-center">
                    <SiFacebook className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={venue.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-facebook"
                      onClick={() =>
                        trackEvent("social_click", "facebook", venue.name)
                      }
                    >
                      Facebook Page
                    </a>
                  </div>
                )}
                {venue.instagramUrl && (
                  <div className="flex items-center">
                    <SiInstagram className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={venue.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-instagram"
                      onClick={() =>
                        trackEvent("social_click", "instagram", venue.name)
                      }
                    >
                      Instagram Profile
                    </a>
                  </div>
                )}
                {venue.twitterUrl && (
                  <div className="flex items-center">
                    <SiX className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={venue.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-twitter"
                      onClick={() =>
                        trackEvent("social_click", "twitter", venue.name)
                      }
                    >
                      X Profile
                    </a>
                  </div>
                )}
                {venue.tikTokUrl && (
                  <div className="flex items-center">
                    <SiTiktok className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={venue.tikTokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-tiktok"
                      onClick={() =>
                        trackEvent("social_click", "tiktok", venue.name)
                      }
                    >
                      TikTok Profile
                    </a>
                  </div>
                )}
                {venue.specialsUrl && (
                  <div className="flex items-center">
                    <Tag className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={venue.specialsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-specials"
                      onClick={() =>
                        trackEvent("specials_click", "contact", venue.name)
                      }
                    >
                      View Specials
                    </a>
                  </div>
                )}
                {(venue as any).leaguesUrl && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={(venue as any).leaguesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-leagues"
                      onClick={() =>
                        trackEvent("leagues_click", "contact", venue.name)
                      }
                    >
                      Join a League
                    </a>
                  </div>
                )}
                {(venue as any).corporateEventsUrl && (
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-3 text-muted-foreground" />
                    <a
                      href={(venue as any).corporateEventsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-venue-corporate-events"
                      onClick={() =>
                        trackEvent(
                          "corporate_events_click",
                          "contact",
                          venue.name,
                        )
                      }
                    >
                      Corporate Events
                    </a>
                  </div>
                )}
                <div className="flex items-center pt-2 border-t mt-2">
                  <MapPin className="w-4 h-4 mr-3 text-muted-foreground" />
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                    data-testid="link-google-maps-contact"
                    onClick={() =>
                      trackEvent(
                        "get_directions_contact",
                        "navigation",
                        venue.name,
                      )
                    }
                  >
                    Open in Google Maps
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {venue.weekdayText && venue.weekdayText.length > 0 ? (
                <div className="space-y-2">
                  {venue.weekdayText.map((dayText, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="font-medium">
                        {dayText.split(":")[0]}
                      </span>
                      <span className="text-muted-foreground">
                        {dayText.split(":").slice(1).join(":").trim()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Hours not available</p>
              )}
            </CardContent>
          </Card>

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity, index) => {
                    const isLeagues =
                      amenity === "Leagues" || amenity === "🏆 Leagues";
                    const leaguesUrl = (venue as any).leaguesUrl;

                    if (isLeagues && leaguesUrl) {
                      return (
                        <a
                          key={index}
                          href={leaguesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackEvent(
                              "amenity_leagues_click",
                              "engagement",
                              venue.name,
                            )
                          }
                          data-testid={`badge-amenity-leagues-link`}
                        >
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            {amenity}
                          </Badge>
                        </a>
                      );
                    }

                    return (
                      <Badge
                        key={index}
                        variant="secondary"
                        data-testid={`badge-amenity-${index}`}
                      >
                        {amenity}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div />
          )}

          {/* Pricing Display - Shows complex or simple pricing */}
          <div className="lg:col-span-3">
            <PricingDisplay
              pricingDetails={venue.pricingDetails}
              simplePricing={venue.pricing}
              venueName={venue.name}
              lastUpdated={venue.updatedAt}
            />
          </div>
        </div>

        {/* Leagues Banner */}
        {venue.amenities &&
          venue.amenities.includes("🏆 Leagues") &&
          venue.phone && (
            <Card className="mb-8 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600">
              <CardContent className="p-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-0 text-left hover:bg-transparent"
                  asChild
                >
                  <a
                    href={`tel:${venue.phone}`}
                    className="block"
                    data-testid="link-leagues-banner"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">🏆</div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-foreground break-words whitespace-normal">
                          This alley offers seasonal leagues, contact them for
                          details.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 break-words whitespace-normal">
                          Tap to call {formatPhoneNumber(venue.phone)}
                        </p>
                      </div>
                    </div>
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

        {/* FAQ Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Cost to Bowl */}
              <AccordionItem
                value="pricing"
                data-testid="accordion-item-pricing"
              >
                <AccordionTrigger data-testid="accordion-trigger-pricing">
                  How much does it cost to bowl at {venue.name}?
                </AccordionTrigger>
                <AccordionContent data-testid="accordion-content-pricing">
                  <p className="text-sm text-muted-foreground">
                    {Number(venue.pricing?.game ?? 0) > 0 ||
                    Number(venue.pricing?.hourly ?? 0) > 0 ? (
                      <>
                        {Number(venue.pricing?.game ?? 0) > 0 && (
                          <>
                            Games are $
                            {formatCurrency(Number(venue.pricing?.game ?? 0))}{" "}
                            per game
                            {venue.isFranchise ? " (starting price)" : ""}.
                            {Number(venue.pricing?.hourly ?? 0) > 0 && " "}
                          </>
                        )}
                        {Number(venue.pricing?.hourly ?? 0) > 0 && (
                          <>
                            Hourly bowling is $
                            {formatCurrency(Number(venue.pricing?.hourly ?? 0))}{" "}
                            per hour
                            {venue.isFranchise ? " (starting price)" : ""}.
                          </>
                        )}
                        {venue.isFranchise
                          ? " Pricing may vary by location."
                          : " Call ahead to confirm current rates."}
                      </>
                    ) : venue.phone ? (
                      <>
                        Pricing information is not available online. Please call{" "}
                        <a
                          href={`tel:${venue.phone}`}
                          className="text-primary hover:text-primary/80 underline"
                          data-testid="link-faq-pricing-phone"
                        >
                          {formatPhoneNumber(venue.phone)}
                        </a>{" "}
                        for current bowling rates.
                      </>
                    ) : venue.website ? (
                      <>
                        Pricing information is not available here. Please visit
                        their{" "}
                        <a
                          href={venue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                          data-testid="link-faq-pricing-website"
                        >
                          website
                        </a>{" "}
                        for current bowling rates.
                      </>
                    ) : (
                      "Pricing information is not currently available. Contact the bowling alley directly for current rates."
                    )}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* Shoe Rental Cost */}
              <AccordionItem value="shoes" data-testid="accordion-item-shoes">
                <AccordionTrigger data-testid="accordion-trigger-shoes">
                  How much do bowling shoes cost at {venue.name}?
                </AccordionTrigger>
                <AccordionContent data-testid="accordion-content-shoes">
                  <p className="text-sm text-muted-foreground">
                    {Number(venue.pricing?.shoeRental ?? 0) > 0 ? (
                      <>
                        Shoe rental is $
                        {formatCurrency(Number(venue.pricing?.shoeRental ?? 0))}{" "}
                        per pair{venue.isFranchise ? " (starting price)" : ""}.
                        {venue.isFranchise
                          ? " Pricing may vary by location."
                          : " Call ahead to confirm current rates."}
                      </>
                    ) : venue.phone ? (
                      <>
                        Shoe rental pricing is not available online. Please call{" "}
                        <a
                          href={`tel:${venue.phone}`}
                          className="text-primary hover:text-primary/80 underline"
                          data-testid="link-faq-shoes-phone"
                        >
                          {formatPhoneNumber(venue.phone)}
                        </a>{" "}
                        for current shoe rental rates.
                      </>
                    ) : venue.website ? (
                      <>
                        Shoe rental pricing is not available here. Please visit
                        their{" "}
                        <a
                          href={venue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                          data-testid="link-faq-shoes-website"
                        >
                          website
                        </a>{" "}
                        for current shoe rental rates.
                      </>
                    ) : (
                      "Shoe rental pricing is not currently available. Contact the bowling alley directly for current rates."
                    )}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* Special Events */}
              <AccordionItem value="events" data-testid="accordion-item-events">
                <AccordionTrigger data-testid="accordion-trigger-events">
                  Do they have any special events like cosmic nights or league
                  nights?
                </AccordionTrigger>
                <AccordionContent data-testid="accordion-content-events">
                  <p className="text-sm text-muted-foreground">
                    {venue.amenities && venue.amenities.length > 0 ? (
                      <>
                        {(venue.amenities.includes("🏆 Leagues") ||
                          venue.amenities.includes("Leagues")) &&
                        venue.amenities.includes("Cosmic Bowling")
                          ? "Yes! They offer both league bowling and cosmic bowling events."
                          : venue.amenities.includes("🏆 Leagues")
                            ? "Yes! They offer league bowling for competitive players."
                            : venue.amenities.includes("Cosmic Bowling") ||
                                venue.amenities.includes("Glow Bowling")
                              ? "Yes! They offer cosmic/glow bowling events with special lighting and music."
                              : "Based on available information, special events are not specifically listed."}
                        {venue.phone && (
                          <>
                            {" "}
                            Call{" "}
                            <a
                              href={`tel:${venue.phone}`}
                              className="text-primary hover:text-primary/80 underline"
                              data-testid="link-faq-events-phone"
                            >
                              {formatPhoneNumber(venue.phone)}
                            </a>{" "}
                            for current schedules and event details.
                          </>
                        )}
                      </>
                    ) : venue.phone ? (
                      <>
                        Information about special events is not available
                        online. Please call{" "}
                        <a
                          href={`tel:${venue.phone}`}
                          className="text-primary hover:text-primary/80 underline"
                          data-testid="link-faq-events-phone-only"
                        >
                          {formatPhoneNumber(venue.phone)}
                        </a>{" "}
                        to ask about cosmic nights, league bowling, and other
                        special events.
                      </>
                    ) : venue.website ? (
                      <>
                        Information about special events is not available here.
                        Please visit their{" "}
                        <a
                          href={venue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                          data-testid="link-faq-events-website"
                        >
                          website
                        </a>{" "}
                        to learn about cosmic nights, league bowling, and other
                        special events.
                      </>
                    ) : (
                      "Information about special events is not currently available. Contact the bowling alley directly to ask about cosmic nights, league bowling, and other events."
                    )}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* Party Hosting - Only show if venue has Parties amenity */}
              {venue.amenities &&
                (venue.amenities.includes("Party Packages") ||
                  venue.amenities.includes("Private Events") ||
                  venue.amenities.includes("Birthday Parties") ||
                  venue.amenities.includes("Parties")) && (
                  <AccordionItem
                    value="parties"
                    data-testid="accordion-item-parties"
                  >
                    <AccordionTrigger data-testid="accordion-trigger-parties">
                      Does {venue.name} host parties?
                    </AccordionTrigger>
                    <AccordionContent data-testid="accordion-content-parties">
                      <p className="text-sm text-muted-foreground">
                        Yes! They offer party packages and private events.
                        {venue.phone && (
                          <>
                            {" "}
                            Call{" "}
                            <a
                              href={`tel:${venue.phone}`}
                              className="text-primary hover:text-primary/80 underline"
                              data-testid="link-faq-parties-phone"
                            >
                              {formatPhoneNumber(venue.phone)}
                            </a>{" "}
                            to book your party and discuss package options.
                          </>
                        )}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                )}
            </Accordion>
          </CardContent>
        </Card>

        {/* Facebook Page Embed - Only show if venue has facebookUrl */}
        {venue.facebookUrl && !isWebview && (
          <Card className="p-6 mt-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <SiFacebook className="w-5 h-5 text-[#1877F2]" />
                Follow on Facebook
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 flex justify-center">
              <div className="overflow-hidden rounded-lg max-w-[500px] w-full">
                <iframe
                  src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(venue.facebookUrl)}&tabs=timeline&width=500&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true`}
                  width="100%"
                  height="500"
                  style={{ border: "none", overflow: "hidden" }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  title={`${venue.name} Facebook Page`}
                  data-testid="facebook-page-embed"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section - Hidden in webview */}
        {!isWebview && (
          <Card className="p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Reviews</h2>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleWriteReview}
                  data-testid="button-write-review"
                >
                  Write a Review
                </Button>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="bg-muted animate-pulse h-32 rounded-lg"></div>
                  <div className="bg-muted animate-pulse h-32 rounded-lg"></div>
                  <div className="bg-muted animate-pulse h-32 rounded-lg"></div>
                </div>
              }
            >
              <ReviewList
                venueId={venue.id}
                onWriteReviewClick={handleWriteReview}
              />
            </Suspense>
          </Card>
        )}

        {/* Share Section - Hidden in webview */}
        {!isWebview && (
          <Card className="my-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share2 className="w-5 h-5 mr-2" />
                Share This Venue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Know someone who loves bowling? Share {venue.name} with them!
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleShareFacebook}
                  data-testid="button-share-facebook"
                  className="flex items-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareTwitter}
                  data-testid="button-share-twitter"
                  className="flex items-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  data-testid="button-share-whatsapp"
                  className="flex items-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareSMS}
                  data-testid="button-share-sms"
                  className="flex items-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" />
                  </svg>
                  Message
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                  className="flex items-center gap-2"
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* People Also Viewed Section - Hidden in webview */}
        {!isWebview &&
          (venue.location?.latitude || venue.lat) &&
          (venue.location?.longitude || venue.lng) && (
            <Suspense
              fallback={
                <div className="mt-12">
                  <div className="h-8 bg-muted animate-pulse rounded w-64 mb-8"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-muted animate-pulse h-64 rounded-lg"></div>
                    <div className="bg-muted animate-pulse h-64 rounded-lg"></div>
                    <div className="bg-muted animate-pulse h-64 rounded-lg"></div>
                  </div>
                </div>
              }
            >
              <PeopleAlsoViewed
                latitude={venue.location?.latitude || venue.lat!}
                longitude={venue.location?.longitude || venue.lng!}
                excludeVenueId={venue.id}
              />
            </Suspense>
          )}

        {/* Bowling Alleys to Explore - always show when not webview */}
        {!isWebview && (
          <Suspense
            fallback={
              <div className="mt-12">
                <div className="h-8 bg-muted animate-pulse rounded w-64 mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-muted animate-pulse h-64 rounded-lg"></div>
                  <div className="bg-muted animate-pulse h-64 rounded-lg"></div>
                  <div className="bg-muted animate-pulse h-64 rounded-lg"></div>
                </div>
              </div>
            }
          >
            <RelatedBlogPosts
              maxResults={9}
              title="Bowling Alleys to Explore"
              filterByState={venue.state}
              excludeVenueId={venue.id}
            />
          </Suspense>
        )}

        {/* Footer Links Section - Hidden in webview */}
        {!isWebview && (
          <div className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Bowling Alleys Column */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Bowling Alleys
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/locations"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="link-browse-locations"
                    >
                      All Bowling Alleys
                    </Link>
                  </li>
                  {venue.city && venue.state && (
                    <li>
                      <Link
                        href={`/locations/${venue.state.replace(/\s+/g, "-")}/${venue.city.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-city-bowling-alleys"
                      >
                        Bowling Alleys in {venue.city}
                      </Link>
                    </li>
                  )}
                  {venue.state && (
                    <li>
                      <Link
                        href={`/locations/${venue.state.replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-state-bowling-alleys"
                      >
                        Bowling Alleys in {venue.state}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              {/* Bowling Leagues Column */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Bowling Leagues
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/bowling-leagues"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="link-bowling-leagues"
                    >
                      All Bowling Leagues
                    </Link>
                  </li>
                  {venue.city && venue.state && (
                    <li>
                      <Link
                        href={`/bowling-leagues/${venue.state.replace(/\s+/g, "-")}/${venue.city.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-city-bowling-leagues"
                      >
                        Bowling Leagues in {venue.city}
                      </Link>
                    </li>
                  )}
                  {venue.state && (
                    <li>
                      <Link
                        href={`/bowling-leagues/${venue.state.replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-state-bowling-leagues"
                      >
                        Bowling Leagues in {venue.state}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              {/* Bowling Costs Column */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Bowling Costs
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/bowling-cost"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="link-bowling-costs-us"
                    >
                      Bowling Costs in the US
                    </Link>
                  </li>
                  {venue.city && venue.state && (
                    <li>
                      <Link
                        href={`/bowling-cost/${venue.state.replace(/\s+/g, "-")}/${venue.city.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-city-bowling-costs"
                      >
                        Bowling Costs in {venue.city}
                      </Link>
                    </li>
                  )}
                  {venue.state && (
                    <li>
                      <Link
                        href={`/bowling-cost/${venue.state.replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-state-bowling-costs"
                      >
                        Bowling Costs in {venue.state}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              {/* Bowling Specials Column */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Bowling Specials
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/specials"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="link-all-specials"
                    >
                      All Bowling Specials
                    </Link>
                  </li>
                  {venue.city && venue.state && (
                    <li>
                      <Link
                        href={`/specials/${venue.state.replace(/\s+/g, "-")}/${venue.city.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-city-bowling-specials"
                      >
                        Bowling Specials in {venue.city}
                      </Link>
                    </li>
                  )}
                  {venue.state && (
                    <li>
                      <Link
                        href={`/specials/${venue.state.replace(/\s+/g, "-")}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="link-state-bowling-specials"
                      >
                        Bowling Specials in {venue.state}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Modals */}
      <Suspense fallback={null}>
        <ReviewForm
          venueId={venue.id}
          isOpen={reviewFormOpen}
          onClose={() => setReviewFormOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </Suspense>

      {/* Floating Action Button - Call (webview) or Reserve / Specials / Website */}
      {(() => {
        const venueData = venue as any;

        // In webview mode, show Call button if phone is available
        if (isWebview && venue.phone) {
          return (
            <Button
              asChild
              className="shadow-lg gap-2"
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                backgroundColor: "#d52231",
                color: "#ffffff",
              }}
              data-testid="button-floating-call"
            >
              <a
                href={`tel:${venue.phone}`}
                onClick={() =>
                  trackEvent("fab_call_click", "engagement", venue.name)
                }
                style={{ color: "#ffffff" }}
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            </Button>
          );
        }

        // Default behavior for non-webview
        if (venueData.reservationsUrl) {
          return (
            <Button
              asChild
              className="shadow-lg gap-2"
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                backgroundColor: "#d52231",
                color: "#ffffff",
              }}
              data-testid="button-floating-reserve"
            >
              <a
                href={venueData.reservationsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("fab_reserve_click", "engagement", venue.name)
                }
                style={{ color: "#ffffff" }}
              >
                <Calendar className="h-4 w-4" />
                Reserve Now
              </a>
            </Button>
          );
        } else if (venueData.leaguesUrl) {
          return (
            <Button
              asChild
              className="shadow-lg gap-2"
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                backgroundColor: "#d52231",
                color: "#ffffff",
              }}
              data-testid="button-floating-leagues"
            >
              <a
                href={venueData.leaguesUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("fab_leagues_click", "engagement", venue.name)
                }
                style={{ color: "#ffffff" }}
              >
                <Users className="h-4 w-4" />
                Join a League
              </a>
            </Button>
          );
        } else if (venueData.specialsUrl) {
          return (
            <Button
              asChild
              className="shadow-lg gap-2"
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                backgroundColor: "#d52231",
                color: "#ffffff",
              }}
              data-testid="button-floating-specials"
            >
              <a
                href={venueData.specialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("fab_specials_click", "engagement", venue.name)
                }
                style={{ color: "#ffffff" }}
              >
                <Tag className="h-4 w-4" />
                View Specials
              </a>
            </Button>
          );
        } else if (venueData.website) {
          return (
            <Button
              asChild
              className="shadow-lg gap-2"
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                backgroundColor: "#d52231",
                color: "#ffffff",
              }}
              data-testid="button-floating-website"
            >
              <a
                href={venueData.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("fab_website_click", "engagement", venue.name)
                }
                style={{ color: "#ffffff" }}
              >
                <ExternalLink className="h-4 w-4" />
                View Alley's Website
              </a>
            </Button>
          );
        }
        return null;
      })()}
    </>
  );
}
