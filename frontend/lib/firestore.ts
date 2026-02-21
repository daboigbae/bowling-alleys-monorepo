import { api, apiRequest } from "./api-client";

// Type for backward compatibility
export type DocumentSnapshot = any;

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  email?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tikTokUrl?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  googlePlaceId?: string;
  lanes: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  isActive: boolean;
  isFranchise?: boolean;
  isTopAlley?: boolean;
  isFoundingPartner?: boolean;
  isSponsor?: boolean;
  claimedByEmail?: string;
  ownerId?: string;
  amenities: string[];
  weekdayText?: string[];
  periods?: Array<{
    open: { day: number; time: string };
    close: { day: number; time: string };
  }>;
  priceLevel?: number | null;
  avgRating: number;
  reviewCount: number;
  createdAt: any;
  updatedAt: any;
  // CRM fields for outreach tracking
  outreachStatus?: 'not_contacted' | 'contacted' | 'follow_up' | 'partnership' | 'rejected' | 'no_response';
  lastContactedAt?: any;
  // Legacy fields for backward compatibility
  postalCode?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  coverPhotoUrl?: string;
  hours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  pricing?: {
    game?: number;
    hourly?: number;
    shoeRental?: number;
  };
  // New flexible pricing structure
  pricingDetails?: VenuePricingDetails;
  // Specials/promotions URL
  specialsUrl?: string;
}

// Flexible pricing structures for complex real-world pricing
export interface PricingPeriod {
  id: string;
  days: string[]; // e.g., ["Monday", "Tuesday"] or ["Friday", "Saturday"]
  timeRange: string; // e.g., "9AM-5PM", "5PM-12AM"
  price: number;
  pricingType: 'per_game' | 'per_person_per_game' | 'hourly' | 'all_you_can_bowl' | 'package';
  description?: string; // e.g., "2 games for seniors 60+", "Cosmic bowling"
  conditions?: string[]; // e.g., ["Seniors 60+", "League bowlers", "18+ only"]
  shoesIncluded?: boolean;
  isSpecialEvent?: boolean; // For cosmic bowling, etc.
}

export interface AdditionalPricingItem {
  id: string;
  name: string; // e.g., "Shoe Rental", "Socks"
  price: number;
  unit?: string; // e.g., "per pair", "per person"
}

export interface VenuePricingDetails {
  periods: PricingPeriod[];
  additionalItems: AdditionalPricingItem[];
  notes?: string[]; // General notes/restrictions
}

export interface Review {
  id: string;
  rating: number;
  text?: string; // Optional - allows star-only reviews
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ReviewWithVenue extends Review {
  venueId: string;
  venueName: string;
  venueCity?: string;
  venueState?: string;
}

export interface User {
  id: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  createdAt: any;
  updatedAt?: any;
  // Profile fields
  slug?: string;
  bio?: string;
  businessName?: string;
  website?: string;
  facebook?: string;
  phone?: string;
  // Owner verification
  isVerifiedOwner?: boolean;
  ownedVenueIds?: string[];
  // Email preferences
  allowUserEmails?: boolean; // General platform emails
  allowOwnerEmails?: boolean; // Owner-specific emails (review alerts, analytics, etc.)
  // Privacy settings
  showReviewsOnProfile?: boolean; // Whether to display reviews on public profile
  // Onboarding
  isOnboarded?: boolean;
}

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  createdAt: any;
  expiresAt: any;
  verified: boolean;
}

// State normalization map - converts any state variation to 2-letter uppercase code
const stateToAbbreviation: Record<string, string> = {
  // Already abbreviated
  ak: "AK", al: "AL", ar: "AR", az: "AZ", ca: "CA", co: "CO", ct: "CT",
  dc: "DC", de: "DE", fl: "FL", ga: "GA", hi: "HI", ia: "IA", id: "ID",
  il: "IL", in: "IN", ks: "KS", ky: "KY", la: "LA", ma: "MA", md: "MD",
  me: "ME", mi: "MI", mn: "MN", mo: "MO", ms: "MS", mt: "MT", nc: "NC",
  nd: "ND", ne: "NE", nh: "NH", nj: "NJ", nm: "NM", nv: "NV", ny: "NY",
  oh: "OH", ok: "OK", or: "OR", pa: "PA", ri: "RI", sc: "SC", sd: "SD",
  tn: "TN", tx: "TX", ut: "UT", va: "VA", vt: "VT", wa: "WA", wi: "WI",
  wv: "WV", wy: "WY",
  // Full names
  alaska: "AK", alabama: "AL", arkansas: "AR", arizona: "AZ",
  california: "CA", colorado: "CO", connecticut: "CT",
  "district of columbia": "DC", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", iowa: "IA", idaho: "ID", illinois: "IL", indiana: "IN",
  kansas: "KS", kentucky: "KY", louisiana: "LA", massachusetts: "MA",
  maryland: "MD", maine: "ME", michigan: "MI", minnesota: "MN", missouri: "MO",
  mississippi: "MS", montana: "MT", "north carolina": "NC", "north dakota": "ND",
  nebraska: "NE", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  nevada: "NV", "new york": "NY", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  virginia: "VA", vermont: "VT", washington: "WA", wisconsin: "WI",
  "west virginia": "WV", wyoming: "WY"
};

// Normalize state to 2-letter uppercase abbreviation
const normalizeStateToAbbr = (state: string): string => {
  const normalized = state.toLowerCase().trim();
  return stateToAbbreviation[normalized] || state.toUpperCase();
};

// Reverse mapping: abbreviation to full state name
export const abbreviationToState: Record<string, string> = {
  AK: "Alaska", AL: "Alabama", AR: "Arkansas", AZ: "Arizona",
  CA: "California", CO: "Colorado", CT: "Connecticut",
  DC: "Washington D.C.", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", IA: "Iowa", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts",
  MD: "Maryland", ME: "Maine", MI: "Michigan", MN: "Minnesota", MO: "Missouri",
  MS: "Mississippi", MT: "Montana", NC: "North Carolina", ND: "North Dakota",
  NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NV: "Nevada", NY: "New York", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VA: "Virginia", VT: "Vermont", WA: "Washington", WI: "Wisconsin",
  WV: "West Virginia", WY: "Wyoming"
};

export interface StateVenueCount {
  state: string;
  abbreviation: string;
  count: number;
}

// ============================================================================
// VENUE CACHE - Reduces Firestore reads using localStorage + memory cache
// ============================================================================
const CACHE_VERSION = 'v4'; // Increment to invalidate old caches
const CACHE_KEY = `bowlingalleys_venues_cache_${CACHE_VERSION}`;
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours

interface VenueCache {
  venues: Venue[];
  timestamp: number;
  isLoading: boolean;
  promise: Promise<Venue[]> | null;
}

const venueCache: VenueCache = {
  venues: [],
  timestamp: 0,
  isLoading: false,
  promise: null,
};

// Load cache from localStorage on startup
const loadFromLocalStorage = (): { venues: Venue[]; timestamp: number } | null => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.venues && parsed.timestamp) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return null;
};

// Save cache to localStorage
const saveToLocalStorage = (venues: Venue[], timestamp: number): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ venues, timestamp }));
  } catch (e) {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
};

// Get all venues from cache or fetch if expired
const getCachedVenues = async (): Promise<Venue[]> => {
  const now = Date.now();
  
  // Check memory cache first
  if (venueCache.venues.length > 0 && (now - venueCache.timestamp) < CACHE_TTL) {
    console.log("Venues: Using memory cache");
    return venueCache.venues;
  }
  
  // Check localStorage cache
  const stored = loadFromLocalStorage();
  if (stored && stored.venues.length > 0 && (now - stored.timestamp) < CACHE_TTL) {
    console.log("Venues: Using localStorage cache");
    venueCache.venues = stored.venues;
    venueCache.timestamp = stored.timestamp;
    return stored.venues;
  }
  
  // If already loading, wait for the existing promise
  if (venueCache.isLoading && venueCache.promise) {
    return venueCache.promise;
  }
  
  // Start loading from server API (which has its own server-side cache)
  venueCache.isLoading = true;
  venueCache.promise = (async () => {
    try {
      console.log("Venues: Fetching from server API");
      const venues = await api.get('/api/venues') as Venue[];
      
      const timestamp = Date.now();
      venueCache.venues = venues;
      venueCache.timestamp = timestamp;
      saveToLocalStorage(venues, timestamp);
      console.log(`Venues: Cached ${venues.length} venues`);
      return venues;
    } catch (error) {
      console.error("Failed to load venues from server:", error);
      // Return stale cache if available (memory or localStorage)
      if (venueCache.venues.length > 0) {
        console.log("Using stale memory cache due to fetch error");
        return venueCache.venues;
      }
      const staleStored = loadFromLocalStorage();
      if (staleStored && staleStored.venues.length > 0) {
        console.log("Using stale localStorage cache due to fetch error");
        return staleStored.venues;
      }
      return [];
    } finally {
      venueCache.isLoading = false;
      venueCache.promise = null;
    }
  })();
  
  return venueCache.promise;
};

// Force refresh the cache (useful after venue updates)
export const invalidateVenueCache = (): void => {
  venueCache.venues = [];
  venueCache.timestamp = 0;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // Ignore
  }
};

// ============================================================================

// Get venue counts grouped by state
export const getVenueCountsByState = async (): Promise<StateVenueCount[]> => {
  const allVenues = await getCachedVenues();
  const stateCounts: Record<string, number> = {};

  allVenues.forEach((venue) => {
    if (venue.state) {
      const abbr = normalizeStateToAbbr(venue.state);
      stateCounts[abbr] = (stateCounts[abbr] || 0) + 1;
    }
  });

  return Object.entries(stateCounts)
    .map(([abbr, count]) => ({
      state: abbreviationToState[abbr] || abbr,
      abbreviation: abbr,
      count
    }))
    .sort((a, b) => a.state.localeCompare(b.state));
};

// Get total venue count
export const getTotalVenueCount = async (): Promise<number> => {
  const allVenues = await getCachedVenues();
  return allVenues.length;
};

export interface Suggestion {
  id: string;
  city: string;
  state: string;
  venueName?: string;
  address?: string;
  userEmail?: string;
  userDisplayName?: string;
  userId?: string;
  status: "pending" | "reviewed" | "implemented";
  createdAt: any;
  // Assigned venue info (when suggestion is linked to a venue)
  venueId?: string;
  assignedVenueId?: string;
  assignedVenueName?: string;
  assignedVenueLocation?: string;
  // Assigned user info (the discoverer)
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  // Contact & social info
  phone?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  // Venue details
  lanes?: number;
  numberOfLanes?: number; // Legacy field alias
  businessHours?: string;
  // Pricing info
  pricePerGame?: number;
  pricePerHour?: number;
  shoeRentalPrice?: number;
  // Features/amenities
  hasCosmicBowling?: boolean;
  hasLeagues?: boolean;
  // Additional notes
  notes?: string;
}

// Venues
export const getVenues = async (): Promise<Venue[]> => {
  return getCachedVenues();
};

export const getTopAlleys = async (): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  return allVenues.filter((venue) => venue.isTopAlley);
};

export const getFoundingPartners = async (): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  return allVenues.filter((venue) => venue.isFoundingPartner);
};

export const getSponsorVenues = async (): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  return allVenues.filter((venue) => venue.isSponsor);
};

export const getFeaturedVenues = async (): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  
  const venues = allVenues.filter((venue) => venue.isFoundingPartner || venue.isSponsor);
  
  // Sort: sponsors first, then founding partners
  return venues.sort((a, b) => {
    if (a.isSponsor && !b.isSponsor) return -1;
    if (!a.isSponsor && b.isSponsor) return 1;
    return 0;
  });
};

// Directory functions for organizing venues by state and city
export const getVenueStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getVenueCitiesByState = async (
  state: string,
): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const cities = new Set<string>();

  // Normalize and filter by state
  const normalizeString = (str: string) => str.toLowerCase().trim();
  const normalizedQueryState = normalizeString(state);

  allVenues.forEach((venue) => {
    const venueState = venue.state ? normalizeString(venue.state) : "";

    // Check if this venue matches the state (with normalization)
    const stateMatches =
      venueState === normalizedQueryState ||
      (normalizedQueryState === "tx" && venueState === "texas") ||
      (normalizedQueryState === "texas" && venueState === "tx") ||
      (normalizedQueryState === "ca" && venueState === "california") ||
      (normalizedQueryState === "california" && venueState === "ca") ||
      (normalizedQueryState === "ny" && venueState === "new york") ||
      (normalizedQueryState === "new york" && venueState === "ny") ||
      (normalizedQueryState === "co" && venueState === "colorado") ||
      (normalizedQueryState === "colorado" && venueState === "co");

    if (stateMatches && venue.city) {
      cities.add(venue.city);
    }
  });

  return Array.from(cities).sort();
};

export const getVenuesByStateAndCity = async (
  state: string,
  city: string,
): Promise<Venue[]> => {
  try {
    // Use API endpoint
    return await api.get(`/api/venues/by-state-city/${state}/${city}`);
  } catch (error) {
    // Fallback to cached venues if API fails
    const allVenues = await getCachedVenues();
    const normalizeString = (str: string) => str.toLowerCase().trim();
    const normalizedQueryState = normalizeString(state);
    const normalizedQueryCity = normalizeString(city);

    const filteredVenues = allVenues.filter((venue) => {
      const venueState = venue.state ? normalizeString(venue.state) : "";
      const venueCity = venue.city ? normalizeString(venue.city) : "";

      const stateMatches =
        venueState === normalizedQueryState ||
        (normalizedQueryState === "tx" && venueState === "texas") ||
        (normalizedQueryState === "texas" && venueState === "tx") ||
        (normalizedQueryState === "ca" && venueState === "california") ||
        (normalizedQueryState === "california" && venueState === "ca") ||
        (normalizedQueryState === "ny" && venueState === "new york") ||
        (normalizedQueryState === "new york" && venueState === "ny") ||
        (normalizedQueryState === "co" && venueState === "colorado") ||
        (normalizedQueryState === "colorado" && venueState === "co");

      return stateMatches && venueCity === normalizedQueryCity;
    });

    filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
    return filteredVenues;
  }
};

// Smart expansion function: expands search area if city has too few results
export const getVenuesWithExpansion = async (
  state: string,
  city: string,
  minResults: number = 10,
): Promise<{ venues: Venue[]; expanded: boolean; expandedArea?: string }> => {
  try {
    // First, try to get venues from the specific city
    const cityVenues = await getVenuesByStateAndCity(state, city);

    // If we have enough results, return them
    if (cityVenues.length >= minResults) {
      return {
        venues: cityVenues,
        expanded: false,
      };
    }

    // Not enough results - expand using distance-based search (100 miles)
    // Use the first city venue as the center point for proximity search
    if (cityVenues.length > 0 && cityVenues[0].location) {
      const centerLat = cityVenues[0].location.latitude;
      const centerLng = cityVenues[0].location.longitude;
      
      // Get all venues from the state
      const stateVenues = await getVenuesByState(state);
      
      // Calculate distances and filter within 100 miles
      const venuesWithDistance = stateVenues
        .map(venue => {
          if (!venue.location?.latitude || !venue.location?.longitude) {
            return { venue, distance: Infinity };
          }
          
          const distance = calculateDistance(
            centerLat,
            centerLng,
            venue.location.latitude,
            venue.location.longitude
          );
          
          return { venue, distance };
        })
        .filter(item => item.distance <= 100)
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.venue);

      return {
        venues: venuesWithDistance,
        expanded: true,
        expandedArea: "within 100 miles",
      };
    }

    // Fallback: if no city venues with location, expand to state level
    const stateVenues = await getVenuesByState(state);
    const sortedStateVenues = stateVenues
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);

    return {
      venues: sortedStateVenues,
      expanded: true,
      expandedArea: state,
    };
  } catch (error) {
    throw error;
  }
};

export const getVenuesByState = async (state: string): Promise<Venue[]> => {
  try {
    // Use API endpoint
    return await api.get(`/api/venues/by-state/${state}`);
  } catch (error) {
    // Fallback to cached venues if API fails
    const allVenues = await getCachedVenues();
    const normalizeString = (str: string) => str.toLowerCase().trim();
    const normalizedQueryState = normalizeString(state);

    const filteredVenues = allVenues.filter((venue) => {
      const venueState = venue.state ? normalizeString(venue.state) : "";
      return (
        venueState === normalizedQueryState ||
        (normalizedQueryState === "tx" && venueState === "texas") ||
        (normalizedQueryState === "texas" && venueState === "tx") ||
        (normalizedQueryState === "ca" && venueState === "california") ||
        (normalizedQueryState === "california" && venueState === "ca") ||
        (normalizedQueryState === "ny" && venueState === "new york") ||
        (normalizedQueryState === "new york" && venueState === "ny") ||
        (normalizedQueryState === "co" && venueState === "colorado") ||
        (normalizedQueryState === "colorado" && venueState === "co")
      );
    });

    return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
  }
};

// Bowling Leagues specific functions - filter venues to only those with "🏆 Leagues" amenity
export const getLeagueStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with leagues
    if (
      venue.state &&
      venue.amenities &&
      (venue.amenities.includes("🏆 Leagues") ||
        venue.amenities.includes("Leagues"))
    ) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getLeagueVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasLeagues =
      venue.amenities &&
      (venue.amenities.includes("🏆 Leagues") ||
        venue.amenities.includes("Leagues"));
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasLeagues;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Tournaments specific functions - filter venues to only those with "Tournaments" amenity
export const getTournamentsStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.amenities && venue.amenities.includes("Tournaments")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getTournamentsVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasTournaments = venue.amenities && venue.amenities.includes("Tournaments");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasTournaments;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Cosmic Bowling specific functions - filter venues to only those with "Glow Bowling" or "Cosmic Bowling" amenities
export const getCosmicStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with cosmic bowling
    if (
      venue.state &&
      venue.amenities &&
      (venue.amenities.includes("Glow Bowling") ||
        venue.amenities.includes("Cosmic Bowling"))
    ) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getCosmicVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasCosmicBowling =
      venue.amenities &&
      (venue.amenities.includes("Glow Bowling") ||
        venue.amenities.includes("Cosmic Bowling"));
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasCosmicBowling;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Open Bowling specific functions - filter venues to only those with "Open Bowling" amenity
export const getOpenBowlingStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with open bowling
    if (venue.state && venue.amenities && venue.amenities.includes("Open Bowling")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getOpenBowlingVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasOpenBowling = venue.amenities && venue.amenities.includes("Open Bowling");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasOpenBowling;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Specials specific functions - filter venues to only those with specialsUrl set
export const getSpecialsStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.specialsUrl) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getSpecialsVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasSpecials = !!venue.specialsUrl;
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasSpecials;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

export const getPartyStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with party support
    if (venue.state && venue.amenities && venue.amenities.includes("Parties")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getPartyVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasParties = venue.amenities && venue.amenities.includes("Parties");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasParties;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Arcade Bowling specific functions - filter venues to only those with "Arcade" amenity
export const getArcadeStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with arcade
    if (venue.state && venue.amenities && venue.amenities.includes("Arcade")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getArcadeVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasArcade = venue.amenities && venue.amenities.includes("Arcade");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasArcade;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Bowling Lessons specific functions - filter venues to only those with "Bowling Lessons" amenity
export const getLessonsStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.amenities && venue.amenities.includes("Bowling Lessons")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getLessonsVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasLessons = venue.amenities && venue.amenities.includes("Bowling Lessons");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasLessons;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Senior Bowling specific functions - filter venues to only those with "Seniors / 55+" amenity
export const getSeniorStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.amenities && venue.amenities.includes("Seniors / 55+")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getSeniorVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasSenior = venue.amenities && venue.amenities.includes("Seniors / 55+");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasSenior;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Corporate Events specific functions - filter venues to only those with "Corporate Events" amenity
export const getCorporateStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.amenities && venue.amenities.includes("Corporate Events")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getCorporateVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasCorporate = venue.amenities && venue.amenities.includes("Corporate Events");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasCorporate;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

export const getBattingCagesStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.amenities && venue.amenities.includes("Batting Cages")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getBattingCagesVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasBattingCages = venue.amenities && venue.amenities.includes("Batting Cages");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasBattingCages;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Bowling Restaurant specific functions - filter venues to only those with "Food" or "Restaurant" amenity
export const getRestaurantStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with food/restaurant
    if (
      venue.state &&
      venue.amenities &&
      (venue.amenities.includes("Food") ||
        venue.amenities.includes("Restaurant"))
    ) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getRestaurantVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasRestaurant =
      venue.amenities &&
      (venue.amenities.includes("Food") ||
        venue.amenities.includes("Restaurant"));
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasRestaurant;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Karaoke Bowling specific functions - filter venues to only those with "Karaoke" amenity
export const getKaraokeStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with karaoke
    if (venue.state && venue.amenities && venue.amenities.includes("Karaoke")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getKaraokeVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasKaraoke = venue.amenities && venue.amenities.includes("Karaoke");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasKaraoke;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Bowling Bar specific functions - filter venues to only those with "Bar" amenity
export const getBarStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with bar
    if (venue.state && venue.amenities && venue.amenities.includes("Bar")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getBarVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();

  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasBar = venue.amenities && venue.amenities.includes("Bar");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasBar;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Sports Bar specific functions - filter venues to only those with "Sports Bar" amenity
export const getSportsBarStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with sports bar
    if (venue.state && venue.amenities && venue.amenities.includes("Sports Bar")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getSportsBarVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasSportsBar = venue.amenities && venue.amenities.includes("Sports Bar");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasSportsBar;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Snack Bar specific functions - filter venues to only those with "Food" amenity
export const getSnackBarStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with food
    if (venue.state && venue.amenities && venue.amenities.includes("Food")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getSnackBarVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasFood = venue.amenities && venue.amenities.includes("Food");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasFood;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Pro Shop specific functions - filter venues to only those with "Pro Shop" amenity
export const getProShopStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with pro shop
    if (venue.state && venue.amenities && venue.amenities.includes("Pro Shop")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getProShopVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasProShop = venue.amenities && venue.amenities.includes("Pro Shop");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasProShop;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Bowling Billiards specific functions - filter venues to only those with "Billiards/Pool" amenity
export const getBilliardsStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with billiards/pool
    if (
      venue.state &&
      venue.amenities &&
      (venue.amenities.includes("Billiards/Pool") ||
        venue.amenities.includes("🎱 Billiards/Pool") ||
        venue.amenities.includes("Pool Tables") ||
        venue.amenities.includes("🎱 Pool Tables"))
    ) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getBilliardsVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasBilliards =
      venue.amenities &&
      (venue.amenities.includes("Billiards/Pool") ||
        venue.amenities.includes("🎱 Billiards/Pool") ||
        venue.amenities.includes("Pool Tables") ||
        venue.amenities.includes("🎱 Pool Tables"));
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasBilliards;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Laser Tag specific functions - filter venues to only those with "Laser Tag" amenity
export const getLaserTagStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with laser tag
    if (venue.state && venue.amenities && venue.amenities.includes("Laser Tag")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getLaserTagVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasLaserTag = venue.amenities && venue.amenities.includes("Laser Tag");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasLaserTag;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Duckpin Bowling specific functions - filter venues to only those with "Duckpin Bowling" amenity
export const getDuckpinBowlingStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with duckpin bowling
    if (venue.state && venue.amenities && venue.amenities.includes("Duckpin Bowling")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getDuckpinBowlingVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();

  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasDuckpinBowling = venue.amenities && venue.amenities.includes("Duckpin Bowling");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasDuckpinBowling;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Escape Rooms specific functions - filter venues to only those with "Escape Rooms" amenity
export const getEscapeRoomsStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with escape rooms
    if (venue.state && venue.amenities && venue.amenities.includes("Escape Rooms")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getEscapeRoomsVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasEscapeRooms = venue.amenities && venue.amenities.includes("Escape Rooms");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasEscapeRooms;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Candlepin Bowling specific functions - filter venues to only those with "Candlepin Bowling" amenity
export const getCandlepinBowlingStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with candlepin bowling
    if (venue.state && venue.amenities && venue.amenities.includes("Candlepin Bowling")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getCandlepinBowlingVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasCandlepinBowling = venue.amenities && venue.amenities.includes("Candlepin Bowling");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasCandlepinBowling;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Wheelchair Accessible specific functions - filter venues to only those with "Wheelchair Accessible" amenity
export const getWheelchairAccessibleStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with wheelchair accessible amenity
    if (venue.state && venue.amenities && venue.amenities.includes("Wheelchair Accessible")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getWheelchairAccessibleVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasWheelchairAccessible = venue.amenities && venue.amenities.includes("Wheelchair Accessible");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasWheelchairAccessible;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Kid-Friendly specific functions - filter venues to only those with "Kid-Friendly" amenity
export const getKidFriendlyStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    if (venue.state && venue.amenities && venue.amenities.includes("Kid-Friendly")) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getKidFriendlyVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasKidFriendly = venue.amenities && venue.amenities.includes("Kid-Friendly");
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasKidFriendly;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

// Ping Pong specific functions - filter venues to only those with "Ping Pong" amenity
export const getPingPongStates = async (): Promise<string[]> => {
  const allVenues = await getCachedVenues();
  const states = new Set<string>();

  allVenues.forEach((venue) => {
    // Only include states that have venues with ping pong
    if (
      venue.state &&
      venue.amenities &&
      (venue.amenities.includes("Ping Pong") ||
        venue.amenities.includes("🏓 Ping Pong") ||
        venue.amenities.includes("Table Tennis") ||
        venue.amenities.includes("🏓 Table Tennis"))
    ) {
      states.add(normalizeStateToAbbr(venue.state));
    }
  });

  return Array.from(states).sort();
};

export const getPingPongVenuesByState = async (state: string): Promise<Venue[]> => {
  const allVenues = await getCachedVenues();
  const normalizedQueryState = normalizeStateToAbbr(state);

  const filteredVenues = allVenues.filter((venue) => {
    const hasPingPong =
      venue.amenities &&
      (venue.amenities.includes("Ping Pong") ||
        venue.amenities.includes("🏓 Ping Pong") ||
        venue.amenities.includes("Table Tennis") ||
        venue.amenities.includes("🏓 Table Tennis"));
    const venueStateAbbr = venue.state ? normalizeStateToAbbr(venue.state) : "";
    return venueStateAbbr === normalizedQueryState && hasPingPong;
  });

  return filteredVenues.sort((a, b) => b.avgRating - a.avgRating);
};

export const getVenue = async (id: string): Promise<Venue | null> => {
  // Try to get from cache first
  const allVenues = await getCachedVenues();
  const cachedVenue = allVenues.find(v => v.id === id);
  if (cachedVenue) return cachedVenue;
  
  // Fallback to API for new/uncached venues
  try {
    return await api.get(`/api/venues/${id}`);
  } catch (error) {
    console.error("Error fetching venue:", error);
    return null;
  }
};

// Reviews
export const getVenueReviews = async (
  venueId: string,
  limitCount = 10,
  lastDoc?: DocumentSnapshot,
): Promise<{ reviews: Review[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    // Fetch from server API (cached)
    const data = await api.get(`/api/venues/${venueId}/reviews`);
    
    // Apply client-side limit (server returns up to 50)
    const reviews = (data.reviews || []).slice(0, limitCount) as Review[];
    return { reviews, lastDoc: null };
  } catch (error) {
    console.error("Error fetching reviews from API:", error);
    return { reviews: [], lastDoc: null };
  }
};

export const getRecentReviews = async (
  limitCount = 6,
): Promise<Array<Review & { venueName: string; venueId: string }>> => {
  try {
    // Fetch from server API (cached)
    const reviews = await api.get(`/api/reviews/recent?limit=${limitCount}`);
    return reviews as Array<Review & { venueName: string; venueId: string }>;
  } catch (error) {
    console.error("Error fetching recent reviews from API:", error);
    return [];
  }
};

export const getUserReviewForVenue = async (
  venueId: string,
  userId: string,
): Promise<Review | null> => {
  try {
    const review = await api.get(`/api/reviews/venue/${venueId}/user/${userId}`);
    return review as Review;
  } catch (error) {
    return null;
  }
};

export const createOrUpdateReview = async (
  venueId: string,
  userId: string,
  userDisplayName: string,
  userPhotoURL: string | undefined,
  rating: number,
  text?: string,
): Promise<void> => {
  await api.post("/api/reviews", {
    venueId,
    rating,
    text,
    userDisplayName,
    userPhotoURL,
  }, true);
  
  // Invalidate venue cache
  invalidateVenueCache();
};

export const deleteReview = async (
  venueId: string,
  userId: string,
): Promise<void> => {
  await api.delete(`/api/reviews/${venueId}`, true);
  
  // Invalidate venue cache
  invalidateVenueCache();
};

export const getReviewsByUserId = async (userId: string): Promise<ReviewWithVenue[]> => {
  try {
    return await api.get(`/api/reviews/user/${userId}`);
  } catch (error) {
    return [];
  }
};

// Users
export const createUser = async (
  uid: string,
  displayName: string,
  photoURL?: string,
): Promise<void> => {
  // User creation is handled by the auth endpoint, this is a no-op now
  // The API will create the user profile when needed
};

export const getUser = async (uid: string): Promise<User | null> => {
  try {
    return await api.get(`/api/users/${uid}`);
  } catch (error) {
    return null;
  }
};

// Saved Alleys
export const addSavedAlley = async (
  userId: string,
  venueId: string
): Promise<void> => {
  await api.post(`/api/users/${userId}/saved-alleys/${venueId}`, {}, true);
};

export const removeSavedAlley = async (
  userId: string,
  venueId: string
): Promise<void> => {
  await api.delete(`/api/users/${userId}/saved-alleys/${venueId}`, true);
};

export const isAlleySaved = async (
  userId: string,
  venueId: string
): Promise<boolean> => {
  try {
    const savedAlleys = await api.get(`/api/users/${userId}/saved-alleys`, true);
    return savedAlleys.some((v: Venue) => v.id === venueId);
  } catch (error) {
    return false;
  }
};

export const getSavedAlleys = async (userId: string): Promise<Venue[]> => {
  try {
    return await api.get(`/api/users/${userId}/saved-alleys`, true);
  } catch (error) {
    return [];
  }
};

// Delete user data from Firestore
export const deleteUserData = async (uid: string): Promise<void> => {
  // User deletion is handled by Firebase Auth, this is a no-op now
  // The API should handle cleanup if needed
};

// Admin CRUD operations for venues
export const createVenue = async (
  venueData: Omit<
    Venue,
    "id" | "avgRating" | "reviewCount" | "createdAt" | "updatedAt"
  >,
): Promise<string> => {
  const result = await api.post("/api/venues", venueData, true);
  invalidateVenueCache();
  return result.id;
};

export const updateVenue = async (
  venueId: string,
  venueData: Partial<Omit<Venue, "id" | "createdAt">>,
): Promise<void> => {
  await api.put(`/api/venues/${venueId}`, venueData, true);
  invalidateVenueCache();
};

export const deleteVenue = async (venueId: string): Promise<void> => {
  await api.delete(`/api/venues/${venueId}`, true);
  invalidateVenueCache();
};

// Get user profile by ID
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    return await api.get(`/api/users/${userId}`);
  } catch (error) {
    return null;
  }
};

// Get user profile by slug
export const getUserBySlug = async (slug: string): Promise<User | null> => {
  try {
    return await api.get(`/api/users/by-slug/${slug}`);
  } catch (error) {
    return null;
  }
};

// Check if slug is already in use by another user
export const isSlugTaken = async (slug: string, currentUserId: string): Promise<boolean> => {
  if (!slug) return false;
  try {
    const user = await api.get(`/api/users/by-slug/${slug}`);
    return user && user.id !== currentUserId;
  } catch (error) {
    return false;
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  profileData: Partial<Omit<User, "id" | "createdAt">>
): Promise<void> => {
  await api.put(`/api/users/${userId}`, profileData, true);
};

// Get venues owned by a user
export const getVenuesByOwner = async (ownerId: string): Promise<Venue[]> => {
  try {
    return await api.get(`/api/users/${ownerId}/venues`);
  } catch (error) {
    return [];
  }
};

// Proximity-based venue search
export interface VenueWithDistance extends Venue {
  distance: number; // in miles
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lon1 - First longitude
 * @param lat2 - Second latitude
 * @param lon2 - Second longitude
 * @returns Distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get venues within a specified radius of given coordinates
 * Uses API endpoint
 */
export const getVenuesByProximity = async (
  latitude: number,
  longitude: number,
  radius: number = 100,
): Promise<VenueWithDistance[]> => {
  try {
    if (!latitude || !longitude) {
      throw new Error("Missing required parameters: latitude and longitude");
    }

    if (latitude < -90 || latitude > 90) {
      throw new Error("Latitude must be between -90 and 90");
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error("Longitude must be between -180 and 180");
    }

    if (radius < 1 || radius > 100) {
      throw new Error("Radius must be between 1 and 100 miles");
    }

    // Use API endpoint
    const venues = await api.get(`/api/venues/by-proximity?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    return venues as VenueWithDistance[];

  } catch (error) {
    throw error;
  }
};

// Suggestions
export interface CreateSuggestionInput {
  city: string;
  state: string;
  email: string;
  venueName?: string;
  address?: string;
  userDisplayName?: string;
  userId?: string;
  phone?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  lanes?: number;
  pricePerGame?: number;
  pricePerHour?: number;
  shoeRentalPrice?: number;
  hasCosmicBowling?: boolean;
  hasLeagues?: boolean;
  notes?: string;
}

export const createSuggestion = async (input: CreateSuggestionInput): Promise<string> => {
  const result = await api.post("/api/suggestions", {
    city: input.city,
    state: input.state,
    email: input.email,
    venueName: input.venueName,
    address: input.address,
    userDisplayName: input.userDisplayName,
    userId: input.userId,
    phone: input.phone,
    website: input.website,
    facebookUrl: input.facebookUrl,
    instagramUrl: input.instagramUrl,
    lanes: input.lanes,
    pricePerGame: input.pricePerGame,
    pricePerHour: input.pricePerHour,
    shoeRentalPrice: input.shoeRentalPrice,
    hasCosmicBowling: input.hasCosmicBowling,
    hasLeagues: input.hasLeagues,
    notes: input.notes,
  });
  return result.id;
};

export const getSuggestionsByUserId = async (userId: string): Promise<Suggestion[]> => {
  try {
    return await api.get(`/api/suggestions/user/${userId}`, true);
  } catch (error) {
    return [];
  }
};

export const getSuggestionByVenueId = async (venueId: string): Promise<Suggestion | null> => {
  try {
    return await api.get(`/api/suggestions/venue/${venueId}`);
  } catch (error) {
    return null;
  }
};

export const updateSuggestion = async (
  suggestionId: string,
  suggestionData: Partial<Omit<Suggestion, "id" | "createdAt">>,
): Promise<void> => {
  // TODO: Add API endpoint for updating suggestions
  // For now, this is a no-op as there's no API endpoint
  console.warn("updateSuggestion: API endpoint not yet implemented");
};

export const deleteSuggestion = async (suggestionId: string): Promise<void> => {
  // TODO: Add API endpoint for deleting suggestions
  // For now, this is a no-op as there's no API endpoint
  console.warn("deleteSuggestion: API endpoint not yet implemented");
};

// Pricing Reports
export interface PricingReport {
  venueCount: number;
  averageGamePrice: number | null;
  averageHourlyPrice: number | null;
  averageShoeRentalPrice: number | null;
  venuesWithGamePricing: number;
  venuesWithHourlyPricing: number;
  venuesWithShoeRentalPricing: number;
  lastUpdated: any;
  state?: string;
  city?: string;
}

// Get the latest report date (helper - not exported, used internally)
const getLatestReportDate = async (): Promise<string | null> => {
  // This is now handled by the API, but we keep it for backward compatibility
  // The API endpoints handle date resolution internally
  return null;
};

// Get USA average pricing
export const getUSAPricing = async (): Promise<PricingReport | null> => {
  try {
    return await api.get("/api/pricing/usa");
  } catch (error) {
    return null;
  }
};

// Get state pricing
export const getStatePricing = async (
  state: string,
): Promise<PricingReport | null> => {
  try {
    return await api.get(`/api/pricing/state/${state}`);
  } catch (error) {
    return null;
  }
};

// Get city pricing
export const getCityPricing = async (
  city: string,
  state: string,
): Promise<PricingReport | null> => {
  try {
    return await api.get(`/api/pricing/city/${city}/${state}`);
  } catch (error) {
    return null;
  }
};

// Get all states with pricing data
export const getPricingStates = async (): Promise<string[]> => {
  try {
    return await api.get("/api/pricing/states");
  } catch (error) {
    return [];
  }
};

// Get all cities with pricing data for a state
export const getPricingCitiesByState = async (
  state: string,
): Promise<string[]> => {
  try {
    return await api.get(`/api/pricing/cities/${state}`);
  } catch (error) {
    return [];
  }
};

// State pricing extremes for USA page
export interface StatePricingExtreme {
  state: string;
  gamePrice: number | null;
  hourlyPrice: number | null;
}

export interface PricingExtremes {
  cheapestByGame: StatePricingExtreme | null;
  mostExpensiveByGame: StatePricingExtreme | null;
  cheapestByHour: StatePricingExtreme | null;
  mostExpensiveByHour: StatePricingExtreme | null;
  reportDate: string | null;
}

// Get cheapest and most expensive states from reports
export const getPricingExtremes = async (): Promise<PricingExtremes> => {
  try {
    const result = await api.get("/api/pricing/extremes");
    return {
      cheapestByGame: result.cheapestByGame ? { state: result.cheapestByGame.state, gamePrice: result.cheapestByGame.gamePrice, hourlyPrice: null } : null,
      mostExpensiveByGame: result.mostExpensiveByGame ? { state: result.mostExpensiveByGame.state, gamePrice: result.mostExpensiveByGame.gamePrice, hourlyPrice: null } : null,
      cheapestByHour: result.cheapestByHour ? { state: result.cheapestByHour.state, gamePrice: null, hourlyPrice: result.cheapestByHour.hourlyPrice } : null,
      mostExpensiveByHour: result.mostExpensiveByHour ? { state: result.mostExpensiveByHour.state, gamePrice: null, hourlyPrice: result.mostExpensiveByHour.hourlyPrice } : null,
      reportDate: result.reportDate,
    };
  } catch (error) {
    return { 
      cheapestByGame: null, 
      mostExpensiveByGame: null, 
      cheapestByHour: null, 
      mostExpensiveByHour: null, 
      reportDate: null 
    };
  }
};

// Hub Types
export interface HubFAQ {
  q: string;
  a: string;
}

export interface Hub {
  id: string;
  stateCode: string;
  topic: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  heroOgImageUrl?: string;
  canonicalPath: string;
  featuredCitySlugs?: string[];
  featuredVenueIds?: string[];
  faq?: HubFAQ[];
  createdAt: any;
  updatedAt: any;
}

// Hub CRUD operations
export const getHubBySlug = async (slug: string): Promise<Hub | null> => {
  try {
    return await api.get(`/api/hubs/${slug}`);
  } catch (error) {
    return null;
  }
};

// ============ AMENITIES COLLECTION ============

export interface Amenity {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  updatedAt: any;
}

// Get all amenities from the central collection
export const getAllAmenities = async (): Promise<Amenity[]> => {
  try {
    return await api.get("/api/amenities");
  } catch (error) {
    return [];
  }
};

// Create a new amenity in the central collection
export const createAmenity = async (data: Partial<Amenity>): Promise<string> => {
  const result = await api.post("/api/amenities", data, true);
  return result.id;
};

// Update an existing amenity
export const updateAmenity = async (id: string, data: Partial<Amenity>): Promise<void> => {
  await api.put(`/api/amenities/${id}`, data, true);
};

// Delete an amenity from the central collection
export const deleteAmenity = async (id: string): Promise<void> => {
  await api.delete(`/api/amenities/${id}`, true);
};
