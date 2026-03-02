/**
 * @deprecated City hubs are now loaded from Firebase (hubs collection).
 * This file is kept for reference only. Add new hubs via Firebase console.
 */
export type CityHubConfig = {
  slug: string;
  city: string;
  state: string;
  stateSlug: string;
  titleTag: string;
  metaDesc: string;
  h1: string;
  intro: string;
  year: string;
  /** Short description for 404/Locations cards */
  cardDesc: string;
  faqs: { q: string; a: string }[];
};

/** Minimal input to add a city. Override any field as needed. */
export type CityHubInput = Pick<CityHubConfig, "city" | "state"> &
  Partial<Omit<CityHubConfig, "city" | "state">>;

function defaultFaqs(city: string, shoeRange = "$3-$5"): { q: string; a: string }[] {
  return [
    { q: `What's the cheapest bowling in ${city}?`, a: `Weekday daytime rates are usually lowest. Many ${city} bowling alleys offer affordable per-game pricing and shoe specials during off-peak hours.` },
    { q: `Where can I find cosmic bowling in ${city}?`, a: `Several ${city} bowling alleys run regular weekend cosmic bowling nights with black lights and music. Check individual venue pages for specific schedules.` },
    { q: "Do I need bowling shoes?", a: `Yes, bowling shoes are required at all alleys for safety. Rentals are available at every bowling center, typically around ${shoeRange} per person.` },
    { q: `Are there bowling leagues in ${city}?`, a: `Yes! Many ${city} bowling alleys host seasonal leagues for all skill levels. Check venue details for league schedules and how to join.` },
  ];
}

export function createCityHub(input: CityHubInput): CityHubConfig {
  const { city, state, ...overrides } = input;
  const stateSlug = state.toLowerCase();
  const slug =
    overrides.slug ??
    `best-bowling-in-${city.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "")}`;
  const year = overrides.year ?? "2025";
  const displayName = `${city}, ${state}`;
  return {
    slug,
    city,
    state,
    stateSlug,
    year,
    titleTag: overrides.titleTag ?? `Best Bowling in ${displayName} (${year}) | Prices, Hours & Reviews`,
    metaDesc: overrides.metaDesc ?? `Discover the top bowling alleys in ${displayName} — compare prices, hours, cosmic nights, and leagues for ${year}. Find the perfect bowling spot for your next visit.`,
    h1: overrides.h1 ?? `Best Bowling in ${displayName} (${year})`,
    intro: overrides.intro ?? `From family-friendly lanes to late-night cosmic sessions, ${city} has solid options. Here are the local favorites with pricing, shoe rental, and cosmic details.`,
    cardDesc: overrides.cardDesc ?? `Complete guide to bowling alleys in ${city}`,
    faqs: overrides.faqs ?? defaultFaqs(city),
    ...overrides,
  };
}

export const CITY_HUBS: CityHubConfig[] = [
  {
    slug: "best-bowling-in-el-paso",
    city: "El Paso",
    state: "TX",
    stateSlug: "tx",
    year: "2025",
    cardDesc: "Complete guide to bowling alleys in West Texas's largest city",
    titleTag: "Best Bowling in El Paso, TX (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in El Paso, TX — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot for your next visit.",
    h1: "Best Bowling in El Paso, TX (2025)",
    intro: "From family-friendly lanes to late-night cosmic sessions, El Paso has solid options across the east and west sides. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("El Paso"),
  },
  {
    slug: "best-bowling-in-charleston-sc",
    city: "Charleston",
    state: "SC",
    stateSlug: "sc",
    year: "2025",
    cardDesc: "Historic charm meets modern bowling in the Lowcountry",
    titleTag: "Best Bowling in Charleston, SC (2025) | Prices, Hours & Reviews",
    metaDesc: "Top bowling in the Charleston area — compare prices, hours, cosmic bowling and leagues. Find the perfect bowling alley for your group or family outing.",
    h1: "Best Bowling in Charleston, SC (2025)",
    intro: "Greater Charleston's bowling scene offers family-friendly lanes and late-night options. Start with these local favorites.",
    faqs: [
      { q: "Which alley is best for parties near Charleston?", a: "Several Charleston-area bowling alleys offer robust party packages with arcade add-ons and cosmic bowling options. Check individual venue pages for party package details and pricing." },
      { q: "Where's the most affordable open bowling?", a: "Prices vary by day and time. Weeknight open bowling sessions typically offer the best value. Check current specials on individual venue pages." },
      { q: "Is there cosmic bowling in Charleston?", a: "Yes! Many Charleston-area bowling alleys run weekend cosmic bowling sessions with black lights and music. Confirm times on venue detail pages close to your visit." },
      { q: "Do bowling alleys in Charleston have leagues?", a: "Yes, several Charleston bowling centers host seasonal leagues for all skill levels and age groups. Visit venue pages to find league schedules." },
    ],
  },
  {
    slug: "best-bowling-in-summerville-sc",
    city: "Summerville",
    state: "SC",
    stateSlug: "sc",
    year: "2025",
    cardDesc: "Family-friendly bowling in Charleston's charming suburb",
    titleTag: "Best Bowling in Summerville, SC (2025) | Prices, Hours & Reviews",
    metaDesc: "Top bowling alleys in Summerville, SC — compare prices, hours, cosmic bowling and leagues. Find the perfect bowling center for your family or group outing.",
    h1: "Best Bowling in Summerville, SC (2025)",
    intro: "Summerville's bowling scene offers family-friendly lanes and entertainment options. Discover the best local bowling alleys in the Flowertown area.",
    faqs: [
      { q: "Which bowling alley is best for birthday parties in Summerville?", a: "Several Summerville-area bowling alleys offer birthday party packages with arcade games, food options, and cosmic bowling. Check individual venue pages for party package details, pricing, and availability." },
      { q: "Where's the most affordable bowling in Summerville?", a: "Bowling prices vary by day and time. Weeknight open bowling sessions typically offer the best value. Check current specials and pricing on individual venue pages." },
      { q: "Is there cosmic bowling in Summerville, SC?", a: "Yes! Many Summerville-area bowling alleys offer cosmic bowling sessions with black lights, music, and special effects. Confirm times and availability on venue detail pages before your visit." },
      { q: "Do Summerville bowling alleys have leagues?", a: "Yes, several Summerville bowling centers host seasonal leagues for all ages and skill levels, including youth leagues, adult leagues, and senior leagues. Visit venue pages to find current league schedules and registration information." },
    ],
  },
  {
    slug: "best-bowling-in-denver",
    city: "Denver",
    state: "CO",
    stateSlug: "co",
    year: "2025",
    cardDesc: "Mile High bowling with stunning Rocky Mountain views",
    titleTag: "Best Bowling in Denver, CO (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Denver, CO — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot for your next visit.",
    h1: "Best Bowling in Denver, CO (2025)",
    intro: "From downtown lanes to suburban bowling centers, Denver offers excellent options for bowlers of all levels. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Denver"),
  },
  {
    slug: "best-bowling-alleys-in-el-cajon",
    city: "El Cajon",
    state: "CA",
    stateSlug: "ca",
    year: "2025",
    cardDesc: "San Diego County bowling with year-round sunshine",
    titleTag: "Best Bowling Alleys in El Cajon, CA (2025) | Prices & Reviews",
    metaDesc: "Discover the top bowling alleys in El Cajon, CA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the San Diego area.",
    h1: "Best Bowling Alleys in El Cajon, CA (2025)",
    intro: "El Cajon's bowling scene offers family-friendly lanes and competitive leagues in the San Diego area. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("El Cajon", "$3-$5"),
  },
  {
    slug: "best-bowling-in-ashburn-va",
    city: "Ashburn",
    state: "VA",
    stateSlug: "va",
    year: "2025",
    cardDesc: "Northern Virginia's premier bowling destination",
    titleTag: "Best Bowling in Ashburn, VA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Ashburn, VA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot for your next visit.",
    h1: "Best Bowling in Ashburn, VA (2025)",
    intro: "From modern entertainment centers to classic bowling alleys, Ashburn and the surrounding Loudoun County area offer great options for bowlers of all ages. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Ashburn", "$3-$4"),
  },
  {
    slug: "best-bowling-in-atlanta",
    city: "Atlanta",
    state: "GA",
    stateSlug: "ga",
    year: "2025",
    cardDesc: "The South's bowling capital with diverse options across the metro",
    titleTag: "Best Bowling in Atlanta, GA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Atlanta, GA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot for your next visit.",
    h1: "Best Bowling in Atlanta, GA (2025)",
    intro: "From bustling downtown lanes to family-friendly suburban centers, Atlanta offers exceptional bowling options for all skill levels. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Atlanta"),
  },
  {
    slug: "best-bowling-in-houston",
    city: "Houston",
    state: "TX",
    stateSlug: "tx",
    year: "2025",
    cardDesc: "Space City bowling with top-rated alleys across Greater Houston",
    titleTag: "Best Bowling in Houston, TX (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Houston, TX — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot for your next visit.",
    h1: "Best Bowling in Houston, TX (2025)",
    intro: "From downtown Houston to the suburbs, the city offers excellent bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Houston"),
  },
  {
    slug: "best-bowling-in-chicago",
    city: "Chicago",
    state: "IL",
    stateSlug: "il",
    year: "2025",
    cardDesc: "Windy City bowling with diverse options across Chicagoland",
    titleTag: "Best Bowling in Chicago, IL (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Chicago, IL — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the Windy City.",
    h1: "Best Bowling in Chicago, IL (2025)",
    intro: "From downtown Chicago to the neighborhoods, the Windy City offers excellent bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Chicago"),
  },
  {
    slug: "best-bowling-in-los-angeles",
    city: "Los Angeles",
    state: "CA",
    stateSlug: "ca",
    year: "2025",
    cardDesc: "City of Angels bowling from Hollywood to Santa Monica",
    titleTag: "Best Bowling in Los Angeles, CA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Los Angeles, CA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the City of Angels.",
    h1: "Best Bowling in Los Angeles, CA (2025)",
    intro: "From Hollywood to Santa Monica, Los Angeles offers diverse bowling experiences for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Los Angeles"),
  },
  {
    slug: "best-bowling-in-baltimore",
    city: "Baltimore",
    state: "MD",
    stateSlug: "md",
    year: "2025",
    cardDesc: "Charm City bowling from Inner Harbor to the neighborhoods",
    titleTag: "Best Bowling in Baltimore, MD (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Baltimore, MD — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in Charm City.",
    h1: "Best Bowling in Baltimore, MD (2025)",
    intro: "From the Inner Harbor to the surrounding neighborhoods, Baltimore offers great bowling experiences for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Baltimore"),
  },
  {
    slug: "best-bowling-in-boston",
    city: "Boston",
    state: "MA",
    stateSlug: "ma",
    year: "2025",
    cardDesc: "Beantown bowling from downtown to the suburbs",
    titleTag: "Best Bowling in Boston, MA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Boston, MA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in Beantown.",
    h1: "Best Bowling in Boston, MA (2025)",
    intro: "From downtown Boston to the surrounding neighborhoods, the city offers excellent bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Boston", "$4-$6"),
  },
  {
    slug: "best-bowling-in-las-vegas",
    city: "Las Vegas",
    state: "NV",
    stateSlug: "nv",
    year: "2025",
    cardDesc: "Sin City bowling from the Strip to the suburbs",
    titleTag: "Best Bowling in Las Vegas, NV (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Las Vegas, NV — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in Sin City.",
    h1: "Best Bowling in Las Vegas, NV (2025)",
    intro: "From the Strip to the suburbs, Las Vegas offers exciting bowling experiences for tourists and locals alike. Whether you're looking for upscale bowling lounges, family-friendly centers, or late-night cosmic sessions, Vegas has it all. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: [
      ...defaultFaqs("Las Vegas", "$4-$6"),
      { q: "What are the best bowling alleys on the Las Vegas Strip?", a: "Several upscale bowling lounges are located on or near the Strip, offering premium experiences with full bars, gourmet food, and VIP lanes. Check our venue listings for Strip-area options." },
    ],
  },
  {
    slug: "best-bowling-in-new-york",
    city: "New York",
    state: "NY",
    stateSlug: "ny",
    year: "2025",
    cardDesc: "Big Apple bowling from Manhattan to Brooklyn",
    titleTag: "Best Bowling in New York City, NY (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in New York City, NY — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the Big Apple.",
    h1: "Best Bowling in New York City, NY (2025)",
    intro: "From Manhattan to Brooklyn, Queens to the Bronx, New York City offers incredible bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: [
      ...defaultFaqs("New York City").slice(0, 2),
      { q: "Do I need bowling shoes?", a: "Yes, bowling shoes are required at all alleys for safety. Rentals are available at every bowling center, typically around $5-$8 per person in NYC." },
      { q: "Are there bowling leagues in New York City?", a: "Yes! Many NYC bowling alleys host seasonal leagues for all skill levels. Check venue details for league schedules and how to join." },
      { q: "What are the best bowling alleys in Brooklyn?", a: "Brooklyn has several excellent bowling options. Use our venue listings to find alleys in Brooklyn with ratings, prices, and hours." },
    ],
  },
  {
    slug: "best-bowling-in-phoenix",
    city: "Phoenix",
    state: "AZ",
    stateSlug: "az",
    year: "2025",
    cardDesc: "Valley of the Sun bowling from Scottsdale to Tempe",
    titleTag: "Best Bowling in Phoenix, AZ (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Phoenix, AZ — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the Valley of the Sun.",
    h1: "Best Bowling in Phoenix, AZ (2025)",
    intro: "From Scottsdale to Tempe, the Greater Phoenix area offers fantastic bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: [
      ...defaultFaqs("Phoenix", "$4-$7"),
      { q: "What are the best bowling alleys in Scottsdale?", a: "Scottsdale and the East Valley have several excellent bowling options. Use our venue listings to find alleys with ratings, prices, and hours." },
    ],
  },
  {
    slug: "best-bowling-in-san-francisco",
    city: "San Francisco",
    state: "CA",
    stateSlug: "ca",
    year: "2025",
    cardDesc: "City by the Bay bowling from the Mission to the Marina",
    titleTag: "Best Bowling in San Francisco, CA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in San Francisco, CA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the City by the Bay.",
    h1: "Best Bowling in San Francisco, CA (2025)",
    intro: "From the Mission to the Marina, San Francisco offers unique bowling experiences for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: [
      ...defaultFaqs("San Francisco", "$5-$8"),
      { q: "What are the best bowling alleys near downtown San Francisco?", a: "San Francisco has several excellent bowling options near downtown and SOMA. Use our venue listings to find alleys with ratings, prices, and hours." },
    ],
  },
  {
    slug: "best-bowling-in-san-diego",
    city: "San Diego",
    state: "CA",
    stateSlug: "ca",
    year: "2025",
    cardDesc: "America's Finest City bowling from beaches to downtown",
    titleTag: "Best Bowling in San Diego, CA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in San Diego, CA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in America's Finest City.",
    h1: "Best Bowling in San Diego, CA (2025)",
    intro: "From the beaches to downtown, San Diego offers incredible bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: [
      ...defaultFaqs("San Diego", "$4-$6"),
      { q: "What are the best bowling alleys near the beach?", a: "San Diego has excellent bowling options throughout the city including areas near Pacific Beach, La Jolla, and Mission Valley. Use our venue listings to find alleys with ratings, prices, and hours." },
    ],
  },
  {
    slug: "best-bowling-in-seattle",
    city: "Seattle",
    state: "WA",
    stateSlug: "wa",
    year: "2025",
    cardDesc: "Emerald City bowling from downtown to the neighborhoods",
    titleTag: "Best Bowling in Seattle, WA (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Seattle, WA — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the Emerald City.",
    h1: "Best Bowling in Seattle, WA (2025)",
    intro: "From downtown Seattle to the surrounding neighborhoods, the Emerald City offers excellent bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Seattle", "$4-$6"),
  },
  {
    slug: "best-bowling-in-miami",
    city: "Miami",
    state: "FL",
    stateSlug: "fl",
    year: "2025",
    cardDesc: "Magic City bowling from South Beach to the suburbs",
    titleTag: "Best Bowling in Miami, FL (2025) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Miami, FL — compare prices, hours, cosmic nights, and leagues for 2025. Find the perfect bowling spot in the Magic City.",
    h1: "Best Bowling in Miami, FL (2025)",
    intro: "From South Beach to the surrounding neighborhoods, Miami offers excellent bowling options for families, leagues, and casual bowlers. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Miami", "$4-$6"),
  },
  {
    slug: "best-bowling-in-colorado-springs",
    city: "Colorado Springs",
    state: "CO",
    stateSlug: "co",
    year: "2026",
    cardDesc: "Bowling at the base of Pikes Peak for military families and visitors",
    titleTag: "Best Bowling in Colorado Springs, CO (2026) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Colorado Springs, CO — compare prices, hours, cosmic nights, and leagues for 2026. Find the perfect bowling spot at the base of the Rockies.",
    h1: "Best Bowling in Colorado Springs, CO (2026)",
    intro: "Nestled at the foot of Pikes Peak, Colorado Springs offers fantastic bowling options for military families, locals, and visitors alike. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Colorado Springs", "$3-$5"),
  },
  {
    slug: "best-bowling-in-dallas-fort-worth",
    city: "Dallas",
    state: "TX",
    stateSlug: "tx",
    year: "2026",
    cardDesc: "Metroplex bowling from upscale centers to classic lanes",
    titleTag: "Best Bowling in Dallas-Fort Worth, TX (2026) | Prices, Hours & Reviews",
    metaDesc: "Discover the top bowling alleys in Dallas-Fort Worth, TX — compare prices, hours, cosmic nights, and leagues for 2026. Find the perfect bowling spot in the Metroplex.",
    h1: "Best Bowling in Dallas-Fort Worth, TX (2026)",
    intro: "The Dallas-Fort Worth Metroplex offers a wide variety of bowling experiences from upscale entertainment centers to classic neighborhood lanes. Here are the local favorites with pricing, shoe rental, and cosmic details.",
    faqs: defaultFaqs("Dallas-Fort Worth", "$3-$5"),
  },
  // Quick-add cities — use createCityHub({ city, state }) or add overrides
  createCityHub({ city: "Austin", state: "TX" }),
  createCityHub({ city: "Nashville", state: "TN" }),
  createCityHub({ city: "Portland", state: "OR" }),
  createCityHub({ city: "Philadelphia", state: "PA" }),
  createCityHub({ city: "Detroit", state: "MI" }),
  createCityHub({ city: "Minneapolis", state: "MN" }),
  createCityHub({ city: "Orlando", state: "FL" }),
  createCityHub({ city: "Tampa", state: "FL" }),
  createCityHub({ city: "Charlotte", state: "NC" }),
  createCityHub({ city: "Raleigh", state: "NC" }),
  createCityHub({ city: "Indianapolis", state: "IN" }),
  createCityHub({ city: "Columbus", state: "OH" }),
  createCityHub({ city: "Cleveland", state: "OH" }),
  createCityHub({ city: "Kansas City", state: "MO" }),
  createCityHub({ city: "St. Louis", state: "MO" }),
  createCityHub({ city: "San Antonio", state: "TX" }),
  createCityHub({ city: "Sacramento", state: "CA" }),
  createCityHub({ city: "Oakland", state: "CA" }),
  createCityHub({ city: "Milwaukee", state: "WI" }),
  createCityHub({ city: "Pittsburgh", state: "PA" }),
];

const slugToConfig = new Map(CITY_HUBS.map((c) => [c.slug, c]));

export function getCityHubBySlug(slug: string): CityHubConfig | undefined {
  return slugToConfig.get(slug);
}

export function getAllCityHubSlugs(): string[] {
  return CITY_HUBS.map((c) => c.slug);
}
