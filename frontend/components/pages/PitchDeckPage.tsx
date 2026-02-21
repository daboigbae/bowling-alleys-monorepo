'use client';

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Star, 
  DollarSign, 
  Target, 
  Zap,
  Building2,
  BarChart3,
  Globe,
  Shield,
  Rocket,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Helmet } from "react-helmet-async";
const heroImage = "/attached_assets/stock_images/modern_bowling_alley_54b5de38.jpg";

export default function PitchDeck() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stats = [
    { label: "Bowling Alleys Listed", value: "500+", icon: Building2, color: "text-blue-600" },
    { label: "Claimed Alleys", value: "5+", icon: Users, color: "text-green-600" },
    { label: "Market Size (US)", value: "$4B", icon: DollarSign, color: "text-purple-600" },
    { label: "Total US Centers", value: "3,500+", icon: Target, color: "text-orange-600" },
  ];

  const traction = [
    { metric: "Platform Coverage", value: "500+ venues (14% of US)", status: "Growing" },
    { metric: "Data Richness", value: "Hours, pricing, amenities", status: "Comprehensive" },
    { metric: "User Features", value: "Reviews, ratings, maps live", status: "Functional" },
    { metric: "Owner Tools", value: "Self-service claiming launched", status: "Ready" },
  ];

  const features = [
    {
      title: "Comprehensive Directory",
      description: "500+ bowling alleys with verified hours, pricing, amenities, and contact info",
      icon: Building2
    },
    {
      title: "Interactive Maps",
      description: "Leaflet-powered maps with color-coded ratings and location-based search",
      icon: MapPin
    },
    {
      title: "Review System",
      description: "Authentic user reviews and ratings to build trust and community",
      icon: Star
    },
    {
      title: "Owner Dashboard",
      description: "Self-service tools for venue owners to claim, update, and manage listings",
      icon: Shield
    },
    {
      title: "Premium City Hubs",
      description: "SEO-optimized city guide pages driving organic traffic and engagement",
      icon: Globe
    },
    {
      title: "CRM & Outreach",
      description: "Advanced admin tools for venue partnerships and business development",
      icon: BarChart3
    }
  ];

  const competitive = [
    { advantage: "First dedicated bowling-focused directory", status: "Category Leader" },
    { advantage: "Structured, searchable data vs scattered reviews", status: "Quality Edge" },
    { advantage: "Owner tools create two-sided marketplace", status: "Network Building" },
    { advantage: "SEO-optimized city guides drive organic traffic", status: "Content Moat" },
    { advantage: "Production platform with 500+ venues live", status: "Execution Advantage" },
  ];

  const roadmap = [
    { phase: "Phase 1 (Complete)", items: ["500+ venue coverage", "Review system", "Owner tools", "City hubs", "CRM system"] },
    { phase: "Phase 2 (6 months)", items: ["3,500+ venue coverage (100%)", "Mobile app", "Booking integration", "Advertising platform", "League finder"] },
    { phase: "Phase 3 (12 months)", items: ["Premium subscriptions for owners", "Sponsored listings", "Event booking", "Corporate partnerships", "API licensing"] },
  ];

  return (
    <>
      <Helmet>
        <title>Investment Pitch Deck - BowlingAlleys.io</title>
        <meta name="description" content="BowlingAlleys.io investor pitch deck. The Yelp for bowling alleys with 500+ verified venues and growing. Connecting 60 million US bowlers with the perfect lanes." />
        <meta name="robots" content="noindex, nofollow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bowlingalleys.io/pitch-deck" />
        <meta property="og:title" content="Investment Pitch Deck - BowlingAlleys.io" />
        <meta property="og:description" content="The Yelp for bowling alleys. Connecting 60 million US bowlers with 500+ verified venues across 27+ states. Join us in building the future of bowling discovery." />
        <meta property="og:image" content={heroImage} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://bowlingalleys.io/pitch-deck" />
        <meta property="twitter:title" content="Investment Pitch Deck - BowlingAlleys.io" />
        <meta property="twitter:description" content="The Yelp for bowling alleys. Connecting 60 million US bowlers with 500+ verified venues across 27+ states." />
        <meta property="twitter:image" content={heroImage} />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://bowlingalleys.io/pitch-deck" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-card">
          <div className="absolute inset-0">
            <img 
              src={heroImage} 
              alt="Modern bowling alley" 
              className="h-full w-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95" />
          </div>
          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <Badge className="mb-4" variant="secondary" data-testid="badge-pitch-category">
                SaaS • Local Discovery • Sports & Recreation
              </Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl" data-testid="heading-pitch-title">
                The Yelp for Bowling Alleys
              </h1>
              <p className="mb-8 text-xl text-muted-foreground md:text-2xl" data-testid="text-pitch-subtitle">
                Connecting 60 million US bowlers with the perfect lanes—one strike at a time
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" className="gap-2" data-testid="button-contact-invest">
                  <DollarSign className="h-5 w-5" />
                  Investment Opportunity
                </Button>
                <Link href="/">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-platform">
                    <Globe className="h-5 w-5" />
                    View Live Platform
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b bg-background py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map((stat, index) => (
                <Card key={index} data-testid={`card-stat-${index}`}>
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <stat.icon className={`mb-3 h-10 w-10 ${stat.color}`} />
                    <div className="text-3xl font-bold" data-testid={`text-stat-value-${index}`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-stat-label-${index}`}>{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="border-b py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-problem">
                The Problem
              </h2>
              <Card className="bg-card" data-testid="card-problem">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                        <Users className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xl font-semibold">60 Million Bowlers, Zero Discovery Platform</h3>
                        <p className="text-muted-foreground">
                          Americans bowl 1.2 billion games annually, but there's no dedicated platform to discover, compare, and review bowling alleys. Bowlers rely on outdated Google Maps listings and scattered Yelp reviews.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                        <Building2 className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xl font-semibold">3,500 Bowling Centers Lack Visibility</h3>
                        <p className="text-muted-foreground">
                          Most bowling alleys have outdated websites or no online presence. They struggle to reach new customers and showcase their unique offerings (cosmic bowling, leagues, birthday parties, etc.).
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                        <DollarSign className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xl font-semibold">Fragmented Information Costs Time & Money</h3>
                        <p className="text-muted-foreground">
                          Users waste time calling alleys for hours and pricing. Venues lose customers who can't easily find accurate information. A $4B industry without a centralized discovery platform.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="border-b bg-muted/20 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-solution">
                The Solution: BowlingAlleys.io
              </h2>
              <Card className="bg-card" data-testid="card-solution">
                <CardContent className="p-8">
                  <div className="mb-8 text-center">
                    <p className="text-lg text-muted-foreground">
                      A comprehensive, user-friendly platform that connects bowlers with the perfect alley while giving venue owners powerful tools to manage their online presence and attract customers.
                    </p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Users className="h-5 w-5 text-primary" />
                        For Bowlers
                      </h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Find bowling alleys by location, price, and amenities</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Read authentic reviews and ratings from real bowlers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>View accurate hours, pricing, and contact information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Interactive maps showing all nearby options at a glance</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Building2 className="h-5 w-5 text-primary" />
                        For Venue Owners
                      </h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Claim and manage your listing with verified badge</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Update hours, pricing, photos, and amenities anytime</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>SEO-optimized owner profiles that rank in Google</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Embeddable review widgets for your website</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Market Opportunity */}
        <section className="border-b py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-market">
                Market Opportunity
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <Card data-testid="card-market-tam">
                  <CardHeader>
                    <CardTitle className="text-center">TAM</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-center">
                    <div className="text-3xl font-bold text-primary">$4.0B</div>
                    <p className="text-sm text-muted-foreground">US bowling industry annual revenue</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-market-sam">
                  <CardHeader>
                    <CardTitle className="text-center">SAM</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-center">
                    <div className="text-3xl font-bold text-primary">$200M</div>
                    <p className="text-sm text-muted-foreground">Addressable: marketing spend (~3% of revenue) + booking fees + subscriptions</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-market-som">
                  <CardHeader>
                    <CardTitle className="text-center">SOM</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-center">
                    <div className="text-3xl font-bold text-primary">$20M</div>
                    <p className="text-sm text-muted-foreground">Conservative 10% market share at maturity (Year 3-5)</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="mt-6" data-testid="card-market-details">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-xl font-semibold">Why This Market Makes Sense</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 font-semibold">Massive Engaged Audience</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• 60M Americans bowl annually</li>
                        <li>• 1.2B games played per year</li>
                        <li>• $4B in annual revenue</li>
                        <li>• Recession-resistant entertainment</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Underserved Digital Market</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• No category-leading bowling discovery platform</li>
                        <li>• Most alleys lack modern web presence</li>
                        <li>• High local search intent ("bowling near me")</li>
                        <li>• Multiple revenue streams available</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Traction */}
        <section className="border-b bg-muted/20 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-traction">
                Traction & Validation
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {traction.map((item, index) => (
                  <Card key={index} data-testid={`card-traction-${index}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span>{item.metric}</span>
                        <Badge variant="secondary">{item.status}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-primary">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="mt-6" data-testid="card-traction-achievements">
                <CardHeader>
                  <CardTitle>Key Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <div className="font-semibold">500+ Bowling Alleys Listed</div>
                        <div className="text-sm text-muted-foreground">14% of US market with comprehensive data (hours, pricing, amenities)</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <div className="font-semibold">SEO City Hub Pages</div>
                        <div className="text-sm text-muted-foreground">Premium guides for major markets driving organic traffic</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <div className="font-semibold">Owner Tools Launched</div>
                        <div className="text-sm text-muted-foreground">Self-service claiming, editing, and embed widgets</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <div className="font-semibold">Admin CRM Tools</div>
                        <div className="text-sm text-muted-foreground">Venue outreach tracking with status management and follow-up scheduling</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <div className="font-semibold">Blog & Content</div>
                        <div className="text-sm text-muted-foreground">Educational content driving search traffic</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <div className="font-semibold">Production Platform</div>
                        <div className="text-sm text-muted-foreground">Live, scalable, Firebase-backed infrastructure</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Product Features */}
        <section className="border-b py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-features">
                Platform Features
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                    <CardHeader>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Competitive Advantages */}
        <section className="border-b bg-muted/20 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-competitive">
                Competitive Advantages
              </h2>
              <Card data-testid="card-competitive">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {competitive.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4" data-testid={`item-competitive-${index}`}>
                        <div className="flex items-center gap-3">
                          <Shield className="h-6 w-6 text-primary" />
                          <span className="font-medium">{item.advantage}</span>
                        </div>
                        <Badge variant="secondary">{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Business Model */}
        <section className="border-b py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-business-model">
                Revenue Model
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <Card data-testid="card-revenue-freemium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Freemium Listings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="mb-1 font-semibold">Free Tier</div>
                      <p className="text-sm text-muted-foreground">Basic listing, reviews, hours, pricing</p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold">Premium ($49-99/mo)</div>
                      <p className="text-sm text-muted-foreground">Featured placement, photo gallery, analytics, embed widgets, priority support</p>
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-revenue-advertising">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Sponsored Listings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="mb-1 font-semibold">Local Advertising</div>
                      <p className="text-sm text-muted-foreground">Featured spots in search results and city pages</p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold">Performance Pricing</div>
                      <p className="text-sm text-muted-foreground">Cost-per-click or flat monthly fees for visibility</p>
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-revenue-booking">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Booking Commissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="mb-1 font-semibold">Party Bookings</div>
                      <p className="text-sm text-muted-foreground">5-10% commission on birthday parties and events</p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold">League Registration</div>
                      <p className="text-sm text-muted-foreground">Referral fees for league signups and tournaments</p>
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-revenue-api">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      API & Data Licensing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="mb-1 font-semibold">B2B API Access</div>
                      <p className="text-sm text-muted-foreground">License structured bowling data to apps, travel sites, event platforms</p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold">White Label</div>
                      <p className="text-sm text-muted-foreground">Power discovery features for enterprise partners</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="border-b bg-muted/20 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-roadmap">
                Growth Roadmap
              </h2>
              <div className="space-y-6">
                {roadmap.map((phase, index) => (
                  <Card key={index} data-testid={`card-roadmap-${index}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Rocket className="h-5 w-5 text-primary" />
                        {phase.phase}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid gap-2 md:grid-cols-2">
                        {phase.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2">
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* The Ask */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl" data-testid="heading-ask">
                The Investment Opportunity
              </h2>
              <Card className="border-primary bg-card" data-testid="card-investment">
                <CardContent className="p-8">
                  <div className="mb-8 text-center">
                    <div className="mb-4 text-5xl font-bold text-primary">Seeking Investment</div>
                    <p className="text-xl text-muted-foreground">
                      To accelerate growth, complete US market coverage, and launch revenue features
                    </p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-4 text-xl font-semibold">Use of Funds</h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Complete coverage of all 3,500 US bowling centers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Launch booking and event management features</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Build mobile apps (iOS & Android)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Sales team to onboard premium subscriptions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Marketing to grow user base and brand awareness</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="mb-4 text-xl font-semibold">Why Now?</h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Platform proven with 500+ venues and working features</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>First dedicated bowling-focused platform (first-mover advantage)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Clear path to revenue with multiple monetization streams</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>Technical infrastructure built, ready to scale</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span>First-mover advantage in underserved $4B market</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-8 rounded-lg border bg-muted/50 p-6 text-center">
                    <p className="mb-4 text-lg font-semibold">Ready to bring America's bowling alleys online?</p>
                    <Button size="lg" className="gap-2" data-testid="button-contact-founder">
                      <DollarSign className="h-5 w-5" />
                      Contact for Investment Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t bg-card py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              BowlingAlleys.io • The Future of Bowling Discovery
            </p>
            <p className="text-xs text-muted-foreground">
              This pitch deck contains forward-looking statements and estimates. Actual results may vary.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
