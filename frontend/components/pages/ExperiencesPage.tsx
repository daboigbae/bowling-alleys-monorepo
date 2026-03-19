"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  PartyPopper,
  DollarSign,
  Gamepad2,
  UtensilsCrossed,
  GlassWater,
  Circle,
  ShoppingBag,
  Zap,
  Mic2,
  Baby,
  GraduationCap,
  Briefcase,
  Users,
  Trophy,
} from "lucide-react";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";

// Duck emoji icon component for Duckpin Bowling
const DuckIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>🦆</span>
);

// Wheelchair emoji icon component for Wheelchair Accessible
const WheelchairIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>♿</span>
);

// Lock emoji icon component for Escape Rooms
const EscapeRoomIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>🔐</span>
);

// Ping Pong emoji icon component
const PingPongIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>🏓</span>
);

// Basketball emoji icon component for Sports Bar
const BasketballIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>🏀</span>
);

// Baseball emoji icon component for Batting Cages
const BaseballIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>⚾</span>
);

// Bowling emoji icon component for Open Bowling
const BowlingIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: '1.5rem' }}>🎳</span>
);

interface ExperienceCard {
  title: string;
  description: string;
  href: string;
  icon: typeof Sparkles | typeof DuckIcon | typeof WheelchairIcon | typeof PingPongIcon | typeof BasketballIcon | typeof BaseballIcon | typeof EscapeRoomIcon | typeof Baby | typeof BowlingIcon | typeof GraduationCap | typeof Briefcase | typeof Users | typeof Trophy;
  available: boolean;
}

const experiences: ExperienceCard[] = [
  {
    title: "Cosmic Bowling",
    description:
      "Find bowling alleys with cosmic or glow bowling in your area. Perfect for a fun night out with friends and family.",
    href: "/cosmic-bowling",
    icon: Sparkles,
    available: true,
  },
  {
    title: "Open Bowling",
    description:
      "Find bowling alleys offering open bowling sessions. Walk in anytime for public lanes — no league or reservation required.",
    href: "/open-bowling",
    icon: BowlingIcon,
    available: true,
  },
  {
    title: "Kids Bowling",
    description:
      "Find kid-friendly bowling alleys with bumper lanes, lightweight balls, arcade games, and family packages perfect for young bowlers.",
    href: "/kids-bowling",
    icon: Baby,
    available: true,
  },
  {
    title: "Birthday Parties",
    description:
      "Discover the best bowling venues for birthday parties with packages, food options, and dedicated party coordinators.",
    href: "/bowling-birthday-party",
    icon: PartyPopper,
    available: true,
  },
  {
    title: "Arcade Bowling",
    description:
      "Explore bowling alleys with arcades and game rooms. Great for families looking for entertainment beyond bowling.",
    href: "/arcade-bowling",
    icon: Gamepad2,
    available: true,
  },
  {
    title: "Batting Cages",
    description:
      "Find bowling alleys with batting cages. Perfect for combining family bowling with baseball practice at entertainment centers.",
    href: "/batting-cages",
    icon: BaseballIcon,
    available: true,
  },
  {
    title: "Bowling Restaurants",
    description:
      "Find bowling alleys with full-service restaurants and great food. Enjoy dining while you bowl at these premier venues.",
    href: "/bowling-restaurant",
    icon: UtensilsCrossed,
    available: true,
  },
  {
    title: "Bowling Bars",
    description:
      "Discover bowling alleys with full bars, craft beer, cocktails, and great drinks. Perfect for adults looking for nightlife entertainment.",
    href: "/bowling-bar",
    icon: GlassWater,
    available: true,
  },
  {
    title: "Sports Bar",
    description:
      "Find bowling alleys with sports bars. Watch live games on big screens while you bowl. Perfect for game day and sports fans.",
    href: "/sports-bar",
    icon: BasketballIcon,
    available: true,
  },
  {
    title: "Snack Bar",
    description:
      "Find bowling alleys with snack bars and food service. Enjoy nachos, pizza, hot dogs, and refreshments while you bowl.",
    href: "/snack-bar",
    icon: UtensilsCrossed,
    available: true,
  },
  {
    title: "Bowling & Billiards",
    description:
      "Find bowling alleys with pool tables and billiards. Enjoy both bowling and pool at these entertainment venues.",
    href: "/bowling-billiards",
    icon: Circle,
    available: true,
  },
  {
    title: "Ping Pong",
    description:
      "Find bowling alleys with ping pong tables. Enjoy table tennis alongside bowling for a complete entertainment experience.",
    href: "/ping-pong",
    icon: PingPongIcon,
    available: true,
  },
  {
    title: "Pro Shop",
    description:
      "Discover bowling alleys with pro shop services. Get expert ball drilling, equipment sales, and professional fitting at these premier venues.",
    href: "/pro-shop",
    icon: ShoppingBag,
    available: true,
  },
  {
    title: "Laser Tag",
    description:
      "Find bowling alleys with laser tag. Combine bowling and laser tag for an action-packed entertainment experience perfect for groups and parties.",
    href: "/laser-tag",
    icon: Zap,
    available: true,
  },
  {
    title: "Karaoke",
    description:
      "Find karaoke near you at bowling alleys. Sing your favorite songs while you bowl for an unforgettable night out with friends and family.",
    href: "/karaoke-bowling",
    icon: Mic2,
    available: true,
  },
  {
    title: "Duckpin Bowling",
    description:
      "Find duckpin bowling alleys near you. Experience this unique bowling variant with smaller balls and pins for a fun, challenging twist on traditional bowling.",
    href: "/duckpin-bowling",
    icon: DuckIcon,
    available: true,
  },
  {
    title: "Candlepin Bowling",
    description:
      "Discover candlepin bowling alleys offering traditional New England bowling. Experience this regional variant with smaller balls and unique pin reset for a classic bowling experience.",
    href: "/candlepin-bowling",
    icon: Sparkles,
    available: true,
  },
  {
    title: "Wheelchair Accessible",
    description:
      "Find wheelchair accessible bowling alleys near you. Discover venues with accessible lanes, equipment, and facilities designed for everyone to enjoy bowling.",
    href: "/wheelchair-accessible",
    icon: WheelchairIcon,
    available: true,
  },
  {
    title: "Escape Rooms",
    description:
      "Find bowling alleys with escape rooms near you. Combine bowling and escape room adventures for the ultimate entertainment experience perfect for team building and group outings.",
    href: "/escape-rooms",
    icon: EscapeRoomIcon,
    available: true,
  },
  {
    title: "Bowling Lessons",
    description:
      "Find bowling alleys offering professional lessons and coaching. Improve your skills with certified instructors and training programs.",
    href: "/bowling-lessons",
    icon: GraduationCap,
    available: true,
  },
  {
    title: "Corporate Events",
    description:
      "Find bowling alleys perfect for corporate events and team building. Discover venues with private party rooms, catering, and group packages.",
    href: "/corporate-events",
    icon: Briefcase,
    available: true,
  },
  {
    title: "Senior Discounts",
    description:
      "Find bowling alleys offering senior discounts and 55+ specials. Discover venues with reduced daytime rates and senior-friendly programs.",
    href: "/senior-bowling",
    icon: Users,
    available: true,
  },
  {
    title: "Tournaments",
    description:
      "Find bowling alleys hosting tournaments and competitive events. Discover local competitions, league championships, and tournament bowling near you.",
    href: "/tournaments",
    icon: Trophy,
    available: true,
  },
];

const faqs = [
  {
    question: "What are bowling experiences?",
    answer:
      "Bowling experiences are specialized features and services offered by bowling alleys beyond regular bowling. These include cosmic bowling with special lighting, birthday party packages, arcade games, late-night bowling, and more. Each experience offers a unique way to enjoy bowling based on your preferences.",
  },
  {
    question: "Which experiences are best for families?",
    answer:
      "Birthday parties and arcade bowling are particularly popular with families. Many bowling alleys offer complete party packages with food, decorations, and dedicated staff. Arcades provide additional entertainment for kids between frames, making the visit more engaging for younger bowlers.",
  },
  {
    question: "Do all cities have cosmic or arcade bowling?",
    answer:
      "Not every bowling alley offers cosmic bowling or arcades, but they're increasingly common in most cities. Larger metropolitan areas typically have multiple venues with these features. Use our directory to filter by specific experiences and find venues near you that offer exactly what you're looking for.",
  },
];

export default function Experiences() {
  // Title, meta description, canonical, and OG tags are set server-side via generateMetadata in page.tsx

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              data-testid="heading-experiences"
            >
              Explore All Bowling Experiences
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From cosmic bowling to birthday parties, discover every type of
              bowling experience available across the United States. Find
              specialized venues, compare prices, and plan your perfect bowling
              outing with our comprehensive guides.
            </p>
          </div>

          {/* Featured Bowling Alleys */}
          <RelatedBlogPosts 
            maxResults={9} 
            title="Featured Bowling Alleys" 
          />

          {/* Experience Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {experiences.map((experience) => {
              const Icon = experience.icon;
              return (
                <NextLink key={experience.href} href={experience.href}>
                  <Card
                    className="h-full hover-elevate active-elevate-2 transition-all cursor-pointer"
                    data-testid={`card-experience-${experience.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">
                        {experience.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {experience.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </NextLink>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-6">
                  <h3
                    className="text-lg font-semibold mb-2"
                    data-testid={`faq-question-${index}`}
                  >
                    {faq.question}
                  </h3>
                  <p
                    className="text-muted-foreground"
                    data-testid={`faq-answer-${index}`}
                  >
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Footer */}
          <div className="text-center bg-primary/5 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-3">
              Ready to Find Your Perfect Bowling Experience?
            </h2>
            <p className="text-muted-foreground mb-6">
              Or start with the full Bowling Alleys Directory to browse all
              venues nationwide.
            </p>
            <NextLink href="/locations">
              <Button data-testid="button-view-directory">
                View Full Directory
              </Button>
            </NextLink>
          </div>
        </div>
      </div>
    </div>
  );
}
