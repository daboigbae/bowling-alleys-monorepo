'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  CheckCircle2,
  Star,
  Users,
  Award,
  MapPin,
  ArrowRight,
  Zap,
  Building2,
  Target,
  Clock,
  Crown,
  Bell,
  BarChart3,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/lib/auth";
const heroImage = "/attached_assets/stock_images/bowling_pins_strike__8e733d70.jpg";

export default function Owner() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleClaimClick = () => {
    if (user) {
      // User is logged in, go to locations page
      window.location.href = "/locations";
    } else {
      // User not logged in, show auth modal
      setAuthMode("signup");
      setAuthModalOpen(true);
    }
  };

  const stats = [
    {
      label: "Monthly Google Searches Reaching Our Network",
      value: "50,000+",
      icon: Eye,
      color: "text-blue-600",
      description: "Real bowlers discovering new alleys",
      badge: "Rising Fast",
    },
    {
      label: "Bowlers Searching Each Month",
      value: "10,000+",
      icon: MousePointerClick,
      color: "text-green-600",
      description: "Active venue lookups from organic traffic",
      badge: "Actively Climbing",
    },
    {
      label: "Founding Partners Already Onboard",
      value: "5",
      icon: Building2,
      color: "text-purple-600",
      description: "Owners who've already claimed their lanes",
      badge: "Expanding Weekly",
    },
    {
      label: "Verified Venues Indexed Nationwide",
      value: "500+",
      icon: MapPin,
      color: "text-orange-600",
      description: "Every lane, searchable in one place",
      badge: "Nationwide Coverage",
    },
  ];

  const platformBenefits = [
    {
      title: "SEO Boost",
      description:
        "Get discovered on Google — your alley appears in 100+ city, state, and experience pages with backlinks.",
      outcome: "Reach thousands of local bowlers searching every week.",
      icon: Target,
    },
    {
      title: "Real-Time Updates",
      description:
        "Update your hours, pricing, leagues, and photos instantly. All changes reflect everywhere automatically.",
      outcome: "Save hours updating flyers or social posts.",
      icon: Zap,
    },
    {
      title: "Direct Customer Connection",
      description:
        "Reply to reviews, post specials, and interact with bowlers directly from your dashboard.",
      outcome: "Turn first-time bowlers into regulars.",
      icon: Users,
    },
    {
      title: "Priority Placement",
      description:
        "Claimed alleys are featured higher on city and state pages, helping you stand out in local searches.",
      outcome: "Be the first alley people see when they search.",
      icon: TrendingUp,
    },
    {
      title: "Analytics Access",
      description:
        "Track views, impressions, and engagement to see how bowlers are finding your alley.",
      outcome: "Know exactly what's driving your traffic.",
      icon: BarChart3,
    },
    {
      title: "Review Alerts",
      description:
        "Get notified instantly when someone leaves feedback so you can respond and keep your reputation strong.",
      outcome: "Stay ahead of your reputation before it slips.",
      icon: Bell,
    },
  ];

  const claimedAlleys = [
    {
      benefit: "Complete Control",
      description:
        "Update your information anytime without waiting for approval",
      isComingSoon: false,
    },
    {
      benefit: "Analytics Dashboard",
      description:
        "See how many people view and click on your listing each month",
      isComingSoon: true,
    },
    {
      benefit: "Review Management",
      description: "Respond to customer reviews and build your reputation",
      isComingSoon: true,
    },
    {
      benefit: "Enhanced Visibility",
      description:
        "Claimed alleys rank higher in search results and get featured placement",
      isComingSoon: true,
    },
  ];

  const testimonials = [
    {
      venueName: "Aztec Lanes",
      venueId: "weWFUV857mhUbA1QARNE",
      quote:
        "We love seeing someone finally organize bowling online — excited to be part of it.",
      owner: "Owner",
    },
    {
      venueName: "Lansing Duckpin",
      venueId: "2jZjyVtExnlnsknef0XY",
      quote:
        "The listing looks amazing — can't wait to see how many new bowlers find us through it.",
      owner: "Owner",
    },
    {
      venueName: "North Bowl",
      venueId: "mdNhplbPHBZS5XeKZ8h4",
      quote:
        "This makes it so much easier for people to find us. Appreciate you setting this up.",
      owner: "Owner",
    },
    {
      venueName: "Royal Lanes",
      venueId: "cPRX1QwcK27wICrZUG5X",
      quote:
        "Finally, someone modernizing bowling online. This is exactly what the industry needed.",
      owner: "Owner",
    },
    {
      venueName: "Arapahoe Bowling Center",
      venueId: "yQQiJkEJKYnIxvcG9oaY",
      quote:
        "The site's a great idea — helpful for both bowlers and centers to stay connected.",
      owner: "Owner",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Partner with BowlingAlleys.io - Grow Your Bowling Business
        </title>
        <meta
          name="description"
          content="Join 5+ bowling alley owners who have already claimed their venue on BowlingAlleys.io. Reach 50,000+ monthly visitors, get premium features, and grow your business."
        />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bowlingalleys.io/owner" />
        <meta
          property="og:title"
          content="Partner with BowlingAlleys.io - Grow Your Bowling Business"
        />
        <meta
          property="og:description"
          content="Join 5+ bowling alley owners who have already claimed their venue. Reach 50,000+ monthly visitors and grow your business."
        />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://bowlingalleys.io/owner" />
        <meta
          property="twitter:title"
          content="Partner with BowlingAlleys.io - Grow Your Bowling Business"
        />
        <meta
          property="twitter:description"
          content="Join 5+ bowling alley owners who have already claimed their venue. Reach 50,000+ monthly visitors and grow your business."
        />

        <link rel="canonical" href="https://bowlingalleys.io/owner" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Breadcrumb Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumb data-testid="breadcrumb-navigation">
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
                <BreadcrumbPage data-testid="text-breadcrumb-owner">
                  For Alley Owners
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-primary/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div className="text-center lg:text-left">
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
                  data-testid="text-hero-title"
                >
                  Your Alley Deserves to Be Found
                </h1>

                <p
                  className="text-2xl font-medium text-foreground mb-6"
                  data-testid="text-hero-benefit"
                >
                  Get discovered on Google, attract more bowlers, and manage
                  your info in one place.
                </p>

                <p
                  className="text-lg text-muted-foreground mb-8"
                  data-testid="text-hero-subtitle"
                >
                  Join the platform connecting{" "}
                  <strong>60 million US bowlers</strong> with local alleys.
                  Claim your venue, reach more players, and grow your business.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                  <Button
                    size="lg"
                    onClick={handleClaimClick}
                    data-testid="button-claim-venue"
                  >
                    Claim Your Venue Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    data-testid="button-see-example"
                  >
                    <Link href="/venue/yQQiJkEJKYnIxvcG9oaY">
                      See Example Listing
                    </Link>
                  </Button>
                </div>

                <div
                  className="flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground"
                  data-testid="text-credibility-badge"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>
                    Indexed across{" "}
                    <strong className="text-foreground">
                      500+ bowling alleys
                    </strong>{" "}
                    nationwide
                  </span>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative hidden lg:block">
                <div className="relative rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={heroImage}
                    alt="Bowling ball striking pins on a modern bowling lane"
                    className="w-full h-auto object-cover"
                    data-testid="img-hero"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl font-bold mb-4"
                data-testid="text-platform-stats-title"
              >
                Platform Growth & Reach
              </h2>
              <p className="text-muted-foreground text-lg">
                Early traction from a fast-growing platform helping alleys get
                discovered
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index} data-testid={`card-stat-${index}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                      <Badge variant="secondary" className="text-xs">
                        {stat.badge}
                      </Badge>
                    </div>
                    <div
                      className="text-3xl font-bold mb-1"
                      data-testid={`text-stat-value-${index}`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-foreground mb-1">
                      {stat.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stat.description}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-social-proof"
              >
                Trusted by local alleys in all 50 states — and growing every
                week.
              </p>
            </div>
          </div>
        </section>

        {/* Success Stories - Social Proof */}
        <section className="py-16 border-b bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl font-bold mb-4"
                data-testid="text-testimonials-title"
              >
                Join Successful Alley Owners
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Real owners already growing their visibility with
                BowlingAlleys.io
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card
                  key={index}
                  className="hover-elevate"
                  data-testid={`card-testimonial-${index}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Link
                          href={`/venue/${testimonial.venueId}`}
                          data-testid={`link-venue-${testimonial.venueId}`}
                        >
                          <CardTitle className="text-lg mb-1 hover:text-primary transition-colors">
                            {testimonial.venueName}
                          </CardTitle>
                        </Link>
                      </div>
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Claimed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="text-sm text-muted-foreground italic mb-3">
                      "{testimonial.quote}"
                    </blockquote>
                    <p className="text-xs font-medium text-foreground">
                      — {testimonial.owner}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Benefits */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl font-bold mb-4"
                data-testid="text-benefits-title"
              >
                Why Alley Owners Love Being on BowlingAlleys.io
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Join hundreds of bowling alleys reaching more bowlers every day.
                <Link
                  href="/founding-partners"
                  className="text-primary hover:underline ml-1"
                  data-testid="link-founding-partners"
                >
                  Learn about our Founding Partners program
                  <Crown className="inline-block w-4 h-4 ml-1 mb-1" />
                </Link>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {platformBenefits.map((benefit, index) => (
                <Card key={index} data-testid={`card-benefit-${index}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <benefit.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {benefit.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3">
                      {benefit.description}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      → {benefit.outcome}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-credibility"
              >
                Built by bowlers, for bowling centers — every feature designed
                to grow your business online.
              </p>
            </div>
          </div>
        </section>

        {/* What You Get */}
        <section className="py-16 border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2
                  className="text-3xl font-bold mb-6"
                  data-testid="text-claimed-title"
                >
                  What Claimed Alleys Get
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Bowling alley owners have already claimed their venues. Here's
                  what they can do that unclaimed alleys can't:
                </p>

                <div className="space-y-6">
                  {claimedAlleys.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-4"
                      data-testid={`benefit-claimed-${index}`}
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            item.isComingSoon
                              ? "bg-yellow-100 dark:bg-yellow-950/30"
                              : "bg-green-100 dark:bg-green-950/30"
                          }`}
                        >
                          {item.isComingSoon ? (
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">
                          {item.benefit}
                          {item.isComingSoon && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Card
                className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                data-testid="card-claim-cta"
              >
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Get Your Alley Discovered — Claim It Today
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <p className="text-sm">
                        <strong>Create a free account</strong> - Takes 30
                        seconds
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <p className="text-sm">
                        <strong>Find your venue</strong> - Search our directory
                        of 500+ alleys
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <p className="text-sm">
                        <strong>Click "Claim This Alley"</strong> - We'll verify
                        ownership
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        4
                      </div>
                      <p className="text-sm">
                        <strong>Start managing</strong> - Update info, respond
                        to reviews
                      </p>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleClaimClick}
                    data-testid="button-get-started"
                  >
                    Get Started - It's Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>

                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span>
                        Verified by real bowling alley owners across the U.S.
                      </span>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      No credit card required • Claim and get verified fast
                    </p>
                  </div>

                  <Card className="bg-background/50 border-primary/10">
                    <CardContent className="pt-4">
                      <blockquote className="text-sm text-muted-foreground italic">
                        "Claiming our alley took less than five minutes — and
                        we've already had bowlers mention finding us through
                        BowlingAlleys.io."
                      </blockquote>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Resources for Owners */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl font-bold mb-4"
                data-testid="text-resources-title"
              >
                Resources for Bowling Alley Owners
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Learn how to grow your business, modernize your marketing, and
                thrive in 2025
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="hover-elevate" data-testid="card-blog-owners">
                <CardHeader>
                  <Badge className="w-fit mb-2" variant="secondary">
                    Business Guide
                  </Badge>
                  <CardTitle>
                    5 Things Every Bowling Alley Owner Should Know in 2025
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    After analyzing 500+ bowling centers, here's what separates
                    the thriving alleys from the ones falling behind. Learn how
                    to modernize your venue and attract more customers.
                  </p>
                  <Button
                    variant="outline"
                    asChild
                    data-testid="button-read-guide"
                  >
                    <Link href="/blog/5-things-bowling-alley-owners-should-know-2025">
                      Read the Guide
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="hover-elevate"
                data-testid="card-blog-onboarding"
              >
                <CardHeader>
                  <Badge className="w-fit mb-2" variant="secondary">
                    Getting Started
                  </Badge>
                  <CardTitle>Bowling Alley Owner Onboarding Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Step-by-step guide to claiming your venue, optimizing your
                    listing, and making the most of BowlingAlleys.io to grow
                    your business and reach more bowlers.
                  </p>
                  <Button
                    variant="outline"
                    asChild
                    data-testid="button-read-onboarding"
                  >
                    <Link href="/blog/bowling-alley-owner-onboarding-guide">
                      Read the Guide
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Button variant="ghost" asChild data-testid="button-all-guides">
                <Link href="/blog">
                  View All Guides & Resources
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2
              className="text-3xl md:text-4xl font-bold mb-6"
              data-testid="text-final-cta-title"
            >
              Join the First 50 Founding Partners
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Don't miss out on exclusive lifetime benefits and priority
              placement. Claim your venue today and start growing your business.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              data-testid="button-final-founding-partners"
            >
              <Link href="/founding-partners">
                Learn How To Become A Founding Partner
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm mt-8 opacity-75">
              Already have an account?{" "}
              <Link
                href="/account"
                className="underline font-medium"
                data-testid="link-signin"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </section>

      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  );
}
