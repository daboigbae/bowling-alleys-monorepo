import type { Express, Response, Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { SitemapStream, streamToPromise } from "sitemap";
import { createGzip } from "zlib";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { requireAuthenticatedAdmin, requireAuthenticatedFullAdmin, authenticateToken } from "./auth";
import admin from "firebase-admin";

// Type definition for venue data
interface VenueData {
  id: string;
  name?: string;
  city?: string;
  state?: string;
  updatedAt?: any;
  [key: string]: any;
}

// Server-side venue cache (refreshes daily at midnight)
const sitemapVenueCache: {
  venues: VenueData[];
  timestamp: number;
  promise: Promise<VenueData[]> | null;
} = {
  venues: [],
  timestamp: 0,
  promise: null,
};

// Check if cache should refresh (past midnight since last update)
function isCacheExpired(): boolean {
  if (sitemapVenueCache.venues.length === 0) return true;
  
  const now = new Date();
  const lastUpdate = new Date(sitemapVenueCache.timestamp);
  
  // Get midnight today
  const midnightToday = new Date(now);
  midnightToday.setHours(0, 0, 0, 0);
  
  // Cache is expired if last update was before today's midnight
  return lastUpdate < midnightToday;
}

// Helper function to get venues from Firestore (with caching)
async function getVenuesForSitemap(): Promise<VenueData[]> {
  // Return cached data if not expired (refreshes daily at midnight)
  if (!isCacheExpired()) {
    console.log("Server cache: Using cached venues");
    return sitemapVenueCache.venues;
  }
  
  // If already loading, wait for existing promise
  if (sitemapVenueCache.promise) {
    console.log("Sitemap: Waiting for in-flight fetch");
    return sitemapVenueCache.promise;
  }
  
  // Fetch fresh data using Firebase Admin SDK
  sitemapVenueCache.promise = (async () => {
    try {
      console.log("Server cache: Fetching fresh venues from Firestore");
      const db = admin.firestore();
      const snapshot = await db.collection("venues").get();

      const venues = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as VenueData,
      );
      
      // Update cache
      sitemapVenueCache.venues = venues;
      sitemapVenueCache.timestamp = Date.now();
      sitemapVenueCache.promise = null;
      
      console.log(`Server cache: Cached ${venues.length} venues`);
      return venues;
    } catch (error) {
      console.error("Server cache: Error fetching venues:", error);
      sitemapVenueCache.promise = null;
      // Return stale cache if available
      if (sitemapVenueCache.venues.length > 0) {
        console.log("Server cache: Using stale cache due to fetch error");
        return sitemapVenueCache.venues;
      }
      return [];
    }
  })();
  
  return sitemapVenueCache.promise;
}

// Fetch a single venue by ID directly from Firestore (no cache) so edit page always gets fresh data after save
async function getVenueById(id: string): Promise<VenueData | null> {
  try {
    const db = admin.firestore();
    const doc = await db.collection("venues").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as VenueData;
  } catch (error) {
    console.error("getVenueById error:", error);
    return null;
  }
}

// Server-side reviews cache (refreshes daily at midnight, per venue)
interface ReviewData {
  id: string;
  rating: number;
  text?: string;
  userId: string;
  userDisplayName?: string;
  createdAt: any;
  [key: string]: any;
}

const reviewsCache: {
  byVenue: Map<string, ReviewData[]>;
  timestamp: number;
  promise: Promise<void> | null;
} = {
  byVenue: new Map(),
  timestamp: 0,
  promise: null,
};

function isReviewsCacheExpired(): boolean {
  if (reviewsCache.byVenue.size === 0) return true;
  
  const now = new Date();
  const lastUpdate = new Date(reviewsCache.timestamp);
  const midnightToday = new Date(now);
  midnightToday.setHours(0, 0, 0, 0);
  
  return lastUpdate < midnightToday;
}

async function loadAllReviews(): Promise<void> {
  if (!isReviewsCacheExpired()) {
    console.log("Server cache: Using cached reviews");
    return;
  }
  
  if (reviewsCache.promise) {
    console.log("Server cache: Waiting for in-flight reviews fetch");
    return reviewsCache.promise;
  }
  
  reviewsCache.promise = (async () => {
    try {
      console.log("Server cache: Fetching reviews from Firestore");
      const db = admin.firestore();
      
      // Get all venues first
      const venues = await getVenuesForSitemap();
      
      // Only fetch reviews for venues that have reviews (based on reviewCount)
      const venuesWithReviews = venues.filter(v => v.reviewCount && v.reviewCount > 0);
      console.log(`Server cache: Fetching reviews for ${venuesWithReviews.length} venues with reviews`);
      
      const newCache = new Map<string, ReviewData[]>();
      let totalReviews = 0;
      
      // Batch fetch in parallel (10 at a time to avoid overwhelming)
      const batchSize = 10;
      for (let i = 0; i < venuesWithReviews.length; i += batchSize) {
        const batch = venuesWithReviews.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (venue) => {
            const reviewsSnapshot = await db
              .collection("venues")
              .doc(venue.id)
              .collection("reviews")
              .orderBy("createdAt", "desc")
              .limit(50)
              .get();
            
            if (!reviewsSnapshot.empty) {
              const reviews = reviewsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              })) as ReviewData[];
              return { venueId: venue.id, reviews };
            }
            return null;
          })
        );
        
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            newCache.set(result.value.venueId, result.value.reviews);
            totalReviews += result.value.reviews.length;
          }
        }
      }
      
      reviewsCache.byVenue = newCache;
      reviewsCache.timestamp = Date.now();
      reviewsCache.promise = null;
      
      console.log(`Server cache: Cached ${totalReviews} reviews for ${newCache.size} venues`);
    } catch (error) {
      console.error("Server cache: Error fetching reviews:", error);
      reviewsCache.promise = null;
    }
  })();
  
  return reviewsCache.promise;
}

function getReviewsForVenue(venueId: string): ReviewData[] {
  return reviewsCache.byVenue.get(venueId) || [];
}

function getRecentReviewsFromCache(limitCount: number = 6): Array<ReviewData & { venueName: string; venueId: string }> {
  const allReviews: Array<ReviewData & { venueName: string; venueId: string }> = [];
  
  // Get venue name mapping
  const venueMap = new Map<string, string>();
  for (const venue of sitemapVenueCache.venues) {
    venueMap.set(venue.id, venue.name || 'Unknown Venue');
  }
  
  // Collect reviews from all venues
  for (const [venueId, reviews] of reviewsCache.byVenue.entries()) {
    const venueName = venueMap.get(venueId) || 'Unknown Venue';
    for (const review of reviews) {
      if (review.text && review.text.length > 10) {
        allReviews.push({
          ...review,
          venueName,
          venueId,
        });
      }
    }
  }
  
  // Sort by createdAt and return top N
  return allReviews
    .sort((a, b) => {
      const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return bTime - aTime;
    })
    .slice(0, limitCount);
}

// Server-side pricing report cache (refreshes daily at midnight, same as venue cache)
interface PricingReportCacheData {
  latestDate: string | null;
  usa: Record<string, any> | null;
  states: Map<string, Record<string, any>>;
  cities: Map<string, Record<string, any>>;
  extremes: {
    cheapestByGame: any;
    mostExpensiveByGame: any;
    cheapestByHour: any;
    mostExpensiveByHour: any;
  } | null;
  timestamp: number;
}

const pricingReportCache: {
  data: PricingReportCacheData | null;
  promise: Promise<PricingReportCacheData | null> | null;
} = {
  data: null,
  promise: null,
};

function isPricingCacheExpired(): boolean {
  if (!pricingReportCache.data) return true;
  const now = new Date();
  const lastUpdate = new Date(pricingReportCache.data.timestamp);
  const midnightToday = new Date(now);
  midnightToday.setHours(0, 0, 0, 0);
  return lastUpdate < midnightToday;
}

async function getPricingReportCache(): Promise<PricingReportCacheData | null> {
  if (!isPricingCacheExpired() && pricingReportCache.data) {
    console.log("Server cache: Using cached pricing report");
    return pricingReportCache.data;
  }
  if (pricingReportCache.promise) {
    return pricingReportCache.promise;
  }
  pricingReportCache.promise = (async (): Promise<PricingReportCacheData | null> => {
    try {
      console.log("Server cache: Fetching fresh pricing report from Firestore");
      const db = admin.firestore();
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const dayBefore = new Date(Date.now() - 172800000).toISOString().split("T")[0];
      let latestDate: string | null = null;
      for (const date of [today, yesterday, dayBefore]) {
        const usaRef = db.collection("reports").doc(date).collection("usa").doc("average");
        const snap = await usaRef.get();
        if (snap.exists) {
          latestDate = date;
          break;
        }
      }
      if (!latestDate) {
        console.log("Server cache: No pricing report found");
        pricingReportCache.promise = null;
        return null;
      }
      const [usaSnap, statesSnap, citiesSnap] = await Promise.all([
        db.collection("reports").doc(latestDate).collection("usa").doc("average").get(),
        db.collection("reports").doc(latestDate).collection("states").get(),
        db.collection("reports").doc(latestDate).collection("cities").get(),
      ]);
      const usa = usaSnap.exists ? usaSnap.data() || null : null;
      const states = new Map<string, Record<string, any>>();
      statesSnap.docs.forEach((d) => states.set(d.id, d.data()));
      const cities = new Map<string, Record<string, any>>();
      citiesSnap.docs.forEach((d) => cities.set(d.id, d.data()));
      const excludedStates = ["DC", "PR", "HI", "AK"];
      let cheapestByGame: any = null;
      let mostExpensiveByGame: any = null;
      let cheapestByHour: any = null;
      let mostExpensiveByHour: any = null;
      states.forEach((data, stateAbbr) => {
        if (excludedStates.includes(stateAbbr)) return;
        const gamePrice = data.averageGamePrice;
        const hourlyPrice = data.averageHourlyPrice;
        if (typeof gamePrice === "number" && gamePrice > 0) {
          if (!cheapestByGame || gamePrice < cheapestByGame.gamePrice) cheapestByGame = { state: stateAbbr, gamePrice };
          if (!mostExpensiveByGame || gamePrice > mostExpensiveByGame.gamePrice) mostExpensiveByGame = { state: stateAbbr, gamePrice };
        }
        if (typeof hourlyPrice === "number" && hourlyPrice > 0) {
          if (!cheapestByHour || hourlyPrice < cheapestByHour.hourlyPrice) cheapestByHour = { state: stateAbbr, hourlyPrice };
          if (!mostExpensiveByHour || hourlyPrice > mostExpensiveByHour.hourlyPrice) mostExpensiveByHour = { state: stateAbbr, hourlyPrice };
        }
      });
      const data: PricingReportCacheData = {
        latestDate,
        usa,
        states,
        cities,
        extremes: { cheapestByGame, mostExpensiveByGame, cheapestByHour, mostExpensiveByHour },
        timestamp: Date.now(),
      };
      pricingReportCache.data = data;
      pricingReportCache.promise = null;
      console.log(`Server cache: Cached pricing report for ${latestDate} (${states.size} states, ${cities.size} cities)`);
      return data;
    } catch (error) {
      console.error("Server cache: Error fetching pricing report:", error);
      pricingReportCache.promise = null;
      if (pricingReportCache.data) {
        console.log("Server cache: Using stale pricing cache due to fetch error");
        return pricingReportCache.data;
      }
      return null;
    }
  })();
  return pricingReportCache.promise;
}

// Helper function to get blog posts from MDX files
async function getBlogPostsForSitemap() {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const matter = await import("gray-matter");

    const contentDir = path.join(process.cwd(), "frontend", "content", "blog");

    if (!fs.existsSync(contentDir)) {
      return [];
    }

    const files = fs.readdirSync(contentDir);
    const posts = [];

    for (const file of files) {
      if (file.endsWith(".mdx")) {
        const filePath = path.join(contentDir, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const { data: frontmatter } = matter.default(fileContent);

        posts.push({
          slug: frontmatter.slug || file.replace(".mdx", ""),
          title: frontmatter.title || "",
          updated:
            frontmatter.updated || frontmatter.date || new Date().toISOString(),
        });
      }
    }

    return posts;
  } catch (error) {
    console.error("Error fetching blog posts for sitemap:", error);
    return [];
  }
}

// Helper function to get all blog posts with full content
async function getAllBlogPosts() {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const matter = await import("gray-matter");

    const contentDir = path.join(process.cwd(), "frontend", "content", "blog");

    if (!fs.existsSync(contentDir)) {
      return [];
    }

    const files = fs.readdirSync(contentDir);
    const posts = [];

    for (const file of files) {
      if (file.endsWith(".mdx")) {
        const slug = file.replace(".mdx", "");
        const filePath = path.join(contentDir, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const { data, content } = matter.default(fileContent);

        posts.push({
          slug,
          title: data.title || "",
          description: data.description,
          author: data.author,
          date: data.date,
          updated: data.updated,
          category: data.category,
          tags: data.tags,
          image: data.image,
          content,
        });
      }
    }

    return posts
      .filter((post) => post.title)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

// Helper function to get a single blog post by slug
async function getBlogPostBySlug(slug: string) {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const matter = await import("gray-matter");

    const filePath = path.join(process.cwd(), "frontend", "content", "blog", `${slug}.mdx`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter.default(fileContent);

    return {
      slug,
      title: data.title || "",
      description: data.description,
      author: data.author,
      date: data.date,
      updated: data.updated,
      category: data.category,
      tags: data.tags,
      image: data.image,
      content,
    };
  } catch (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return null;
  }
}

// Helper function to get owner profiles from Firestore
async function getOwnerProfilesForSitemap() {
  try {
    const { initializeApp } = await import("firebase/app");
    const { getFirestore, collection, getDocs } = await import(
      "firebase/firestore"
    );

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".appspot.com",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    // Filter for users with slugs (owner profiles)
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((user: any) => user.slug); // Only include users with slug set
  } catch (error) {
    console.error("Error fetching owner profiles for sitemap:", error);
    return [];
  }
}

// Helper function to get venue states and cities
async function getLocationDataForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getLocationDataForSitemap: Total venues:", venues.length);

    const statesSet = new Set(venues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getLocationDataForSitemap: Unique states:", states);

    const locations = [];
    for (const state of states) {
      const citiesSet = new Set(
        venues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(`getLocationDataForSitemap: Cities in ${state}:`, cities);

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getLocationDataForSitemap: Final locations:",
      locations.length,
    );
    return { states, locations };
  } catch (error) {
    console.error("Error fetching location data for sitemap:", error);
    return { states: [], locations: [] };
  }
}

// Helper function to get states with venues that have leagues
async function getLeagueStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getLeagueStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have leagues amenity
    const leagueVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("🏆 Leagues") || v.amenities.includes("Leagues")),
    );
    console.log(
      "getLeagueStatesForSitemap: League venues:",
      leagueVenues.length,
    );

    const statesSet = new Set(leagueVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getLeagueStatesForSitemap: Unique league states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching league states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have leagues
async function getLeagueLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getLeagueLocationsForSitemap: Total venues:", venues.length);

    // Filter venues that have leagues amenity
    const leagueVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("🏆 Leagues"),
    );
    console.log(
      "getLeagueLocationsForSitemap: League venues:",
      leagueVenues.length,
    );

    const locations = [];
    const statesSet = new Set(leagueVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        leagueVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getLeagueLocationsForSitemap: League cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getLeagueLocationsForSitemap: Final league locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching league locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have cosmic bowling
async function getCosmicStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getCosmicStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have cosmic bowling amenity
    const cosmicVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Glow Bowling") ||
          v.amenities.includes("Cosmic Bowling")),
    );
    console.log(
      "getCosmicStatesForSitemap: Cosmic venues:",
      cosmicVenues.length,
    );

    const statesSet = new Set(cosmicVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getCosmicStatesForSitemap: Unique cosmic states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching cosmic states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have cosmic bowling
async function getCosmicLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getCosmicLocationsForSitemap: Total venues:", venues.length);

    // Filter venues that have cosmic bowling amenity
    const cosmicVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Glow Bowling") ||
          v.amenities.includes("Cosmic Bowling")),
    );
    console.log(
      "getCosmicLocationsForSitemap: Cosmic venues:",
      cosmicVenues.length,
    );

    const locations = [];
    const statesSet = new Set(cosmicVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        cosmicVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getCosmicLocationsForSitemap: Cosmic cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getCosmicLocationsForSitemap: Final cosmic locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching cosmic locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have open bowling
async function getOpenBowlingStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getOpenBowlingStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have open bowling amenity
    const openBowlingVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Open Bowling"),
    );
    console.log(
      "getOpenBowlingStatesForSitemap: Open Bowling venues:",
      openBowlingVenues.length,
    );

    const statesSet = new Set(
      openBowlingVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getOpenBowlingStatesForSitemap: Unique open bowling states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching open bowling states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have open bowling
async function getOpenBowlingLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getOpenBowlingLocationsForSitemap: Total venues:",
      venues.length,
    );

    // Filter venues that have open bowling amenity
    const openBowlingVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Open Bowling"),
    );
    console.log(
      "getOpenBowlingLocationsForSitemap: Open Bowling venues:",
      openBowlingVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      openBowlingVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        openBowlingVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getOpenBowlingLocationsForSitemap: Open Bowling cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getOpenBowlingLocationsForSitemap: Final open bowling locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching open bowling locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with specials venues
async function getSpecialsStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    const specialsVenues = venues.filter((v) => v.specialsUrl);
    const statesSet = new Set(specialsVenues.map((v) => v.state).filter(Boolean));
    return Array.from(statesSet);
  } catch (error) {
    console.error("Error fetching specials states for sitemap:", error);
    return [];
  }
}

// Helper function to get state/city locations with specials venues
async function getSpecialsLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    const specialsVenues = venues.filter((v) => v.specialsUrl);
    const locations: { state: string; city: string }[] = [];
    const statesSet = new Set(specialsVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    for (const state of states) {
      const citiesSet = new Set(
        specialsVenues.filter((v) => v.state === state).map((v) => v.city).filter(Boolean),
      );
      for (const city of citiesSet) {
        locations.push({ state: state!, city: city! });
      }
    }
    return locations;
  } catch (error) {
    console.error("Error fetching specials locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with pricing data (uses server pricing cache)
async function getPricingStatesForSitemap(): Promise<string[]> {
  try {
    const cache = await getPricingReportCache();
    if (!cache || !cache.latestDate) {
      console.log("getPricingStatesForSitemap: No pricing cache");
      return [];
    }
    const states = Array.from(cache.states.keys()).sort();
    console.log(
      "getPricingStatesForSitemap: Pricing states found:",
      states.length,
      states,
    );
    return states;
  } catch (error) {
    console.error("Error fetching pricing states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with pricing data (uses server pricing cache)
async function getPricingLocationsForSitemap(): Promise<
  Array<{ state: string; city: string }>
> {
  try {
    const cache = await getPricingReportCache();
    if (!cache || !cache.latestDate) {
      console.log("getPricingLocationsForSitemap: No pricing cache");
      return [];
    }
    const locations: Array<{ state: string; city: string }> = [];
    cache.cities.forEach((_, docId) => {
      // Document ID format: "City-STATE" (e.g., "Surprise-AZ")
      const parts = docId.split("-");
      if (parts.length >= 2) {
        const state = parts[parts.length - 1];
        const city = parts.slice(0, -1).join("-");
        locations.push({ state, city });
      }
    });
    console.log(
      "getPricingLocationsForSitemap: Pricing locations found:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching pricing locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have birthday party support
async function getPartyStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getPartyStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have party amenity
    const partyVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Parties"),
    );
    console.log("getPartyStatesForSitemap: Party venues:", partyVenues.length);

    const statesSet = new Set(partyVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getPartyStatesForSitemap: Unique party states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching party states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have birthday party support
async function getPartyLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getPartyLocationsForSitemap: Total venues:", venues.length);

    // Filter venues that have party amenity
    const partyVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Parties"),
    );
    console.log(
      "getPartyLocationsForSitemap: Party venues:",
      partyVenues.length,
    );

    const locations = [];
    const statesSet = new Set(partyVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        partyVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getPartyLocationsForSitemap: Party cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getPartyLocationsForSitemap: Final party locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching party locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have arcade bowling
async function getArcadeStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getArcadeStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have arcade amenity
    const arcadeVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Arcade"),
    );
    console.log(
      "getArcadeStatesForSitemap: Arcade venues:",
      arcadeVenues.length,
    );

    const statesSet = new Set(arcadeVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getArcadeStatesForSitemap: Unique arcade states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching arcade states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have arcade bowling
async function getArcadeLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getArcadeLocationsForSitemap: Total venues:", venues.length);

    // Filter venues that have arcade amenity
    const arcadeVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Arcade"),
    );
    console.log(
      "getArcadeLocationsForSitemap: Arcade venues:",
      arcadeVenues.length,
    );

    const locations = [];
    const statesSet = new Set(arcadeVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        arcadeVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getArcadeLocationsForSitemap: Arcade cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getArcadeLocationsForSitemap: Final arcade locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching arcade locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have restaurants
async function getRestaurantStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getRestaurantStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have restaurant amenity
    const restaurantVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Food") || v.amenities.includes("Restaurant")),
    );
    console.log(
      "getRestaurantStatesForSitemap: Restaurant venues:",
      restaurantVenues.length,
    );

    const statesSet = new Set(
      restaurantVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getRestaurantStatesForSitemap: Unique restaurant states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching restaurant states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have restaurants
async function getRestaurantLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getRestaurantLocationsForSitemap: Total venues:",
      venues.length,
    );

    // Filter venues that have restaurant amenity
    const restaurantVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Food") || v.amenities.includes("Restaurant")),
    );
    console.log(
      "getRestaurantLocationsForSitemap: Restaurant venues:",
      restaurantVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      restaurantVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        restaurantVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getRestaurantLocationsForSitemap: Restaurant cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getRestaurantLocationsForSitemap: Final restaurant locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching restaurant locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have bars
async function getBarStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getBarStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have bar amenity
    const barVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Bar"),
    );
    console.log("getBarStatesForSitemap: Bar venues:", barVenues.length);

    const statesSet = new Set(barVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getBarStatesForSitemap: Unique bar states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching bar states for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have sports bars
async function getSportsBarStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getSportsBarStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have sports bar amenity
    const sportsBarVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Sports Bar"),
    );
    console.log("getSportsBarStatesForSitemap: Sports bar venues:", sportsBarVenues.length);

    const statesSet = new Set(sportsBarVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getSportsBarStatesForSitemap: Unique sports bar states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching sports bar states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have sports bars
async function getSportsBarLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getSportsBarLocationsForSitemap: Total venues:", venues.length);

    // Filter venues that have sports bar amenity
    const sportsBarVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Sports Bar"),
    );
    console.log("getSportsBarLocationsForSitemap: Sports bar venues:", sportsBarVenues.length);

    const locations = [];
    const statesSet = new Set(sportsBarVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        sportsBarVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(`getSportsBarLocationsForSitemap: Sports bar cities in ${state}:`, cities);

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getSportsBarLocationsForSitemap: Final sports bar locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching sports bar locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have snack bars (Food amenity)
async function getSnackBarStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getSnackBarStatesForSitemap: Total venues:", venues.length);

    const snackBarVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Food"),
    );
    console.log("getSnackBarStatesForSitemap: Snack bar venues:", snackBarVenues.length);

    const statesSet = new Set(snackBarVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);
    console.log("getSnackBarStatesForSitemap: Unique snack bar states:", states);

    return states;
  } catch (error) {
    console.error("Error fetching snack bar states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have snack bars (Food amenity)
async function getSnackBarLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getSnackBarLocationsForSitemap: Total venues:", venues.length);

    const snackBarVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Food"),
    );
    console.log("getSnackBarLocationsForSitemap: Snack bar venues:", snackBarVenues.length);

    const locations = [];
    const statesSet = new Set(snackBarVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        snackBarVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(`getSnackBarLocationsForSitemap: Snack bar cities in ${state}:`, cities);

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getSnackBarLocationsForSitemap: Final snack bar locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching snack bar locations for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have bars
async function getBarLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getBarLocationsForSitemap: Total venues:", venues.length);

    // Filter venues that have bar amenity
    const barVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Bar"),
    );
    console.log("getBarLocationsForSitemap: Bar venues:", barVenues.length);

    const locations = [];
    const statesSet = new Set(barVenues.map((v) => v.state).filter(Boolean));
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        barVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(`getBarLocationsForSitemap: Bar cities in ${state}:`, cities);

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getBarLocationsForSitemap: Final bar locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching bar locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have pro shop
async function getProShopStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getProShopStatesForSitemap: Total venues:", venues.length);

    const proShopVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Pro Shop"),
    );
    console.log(
      "getProShopStatesForSitemap: Pro Shop venues:",
      proShopVenues.length,
    );

    const statesSet = new Set(
      proShopVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getProShopStatesForSitemap: Unique pro shop states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching pro shop states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have pro shop
async function getProShopLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getProShopLocationsForSitemap: Total venues:",
      venues.length,
    );

    const proShopVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Pro Shop"),
    );
    console.log(
      "getProShopLocationsForSitemap: Pro Shop venues:",
      proShopVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      proShopVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        proShopVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getProShopLocationsForSitemap: Pro Shop cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getProShopLocationsForSitemap: Final pro shop locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching pro shop locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have batting cages
async function getBattingCagesStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getBattingCagesStatesForSitemap: Total venues:", venues.length);

    const battingCagesVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Batting Cages"),
    );
    console.log(
      "getBattingCagesStatesForSitemap: Batting Cages venues:",
      battingCagesVenues.length,
    );

    const statesSet = new Set(
      battingCagesVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getBattingCagesStatesForSitemap: Unique batting cages states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching batting cages states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have batting cages
async function getBattingCagesLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getBattingCagesLocationsForSitemap: Total venues:",
      venues.length,
    );

    const battingCagesVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Batting Cages"),
    );
    console.log(
      "getBattingCagesLocationsForSitemap: Batting Cages venues:",
      battingCagesVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      battingCagesVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        battingCagesVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getBattingCagesLocationsForSitemap: Batting Cages cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getBattingCagesLocationsForSitemap: Final batting cages locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching batting cages locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have billiards/pool
async function getBilliardsStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getBilliardsStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have billiards/pool amenity
    const billiardsVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Billiards/Pool") ||
          v.amenities.includes("🎱 Billiards/Pool") ||
          v.amenities.includes("Pool Tables") ||
          v.amenities.includes("🎱 Pool Tables")),
    );
    console.log(
      "getBilliardsStatesForSitemap: Billiards venues:",
      billiardsVenues.length,
    );

    const statesSet = new Set(
      billiardsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getBilliardsStatesForSitemap: Unique billiards states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching billiards states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have billiards/pool
async function getBilliardsLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getBilliardsLocationsForSitemap: Total venues:",
      venues.length,
    );

    // Filter venues that have billiards/pool amenity
    const billiardsVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Billiards/Pool") ||
          v.amenities.includes("🎱 Billiards/Pool") ||
          v.amenities.includes("Pool Tables") ||
          v.amenities.includes("🎱 Pool Tables")),
    );
    console.log(
      "getBilliardsLocationsForSitemap: Billiards venues:",
      billiardsVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      billiardsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        billiardsVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getBilliardsLocationsForSitemap: Billiards cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getBilliardsLocationsForSitemap: Final billiards locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching billiards locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have ping pong
async function getPingPongStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getPingPongStatesForSitemap: Total venues:", venues.length);

    // Filter venues that have ping pong amenity
    const pingPongVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Ping Pong") ||
          v.amenities.includes("Table Tennis")),
    );
    console.log(
      "getPingPongStatesForSitemap: Ping Pong venues:",
      pingPongVenues.length,
    );

    const statesSet = new Set(
      pingPongVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getPingPongStatesForSitemap: Unique ping pong states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching ping pong states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have ping pong
async function getPingPongLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getPingPongLocationsForSitemap: Total venues:",
      venues.length,
    );

    // Filter venues that have ping pong amenity
    const pingPongVenues = venues.filter(
      (v) =>
        v.amenities &&
        (v.amenities.includes("Ping Pong") ||
          v.amenities.includes("Table Tennis")),
    );
    console.log(
      "getPingPongLocationsForSitemap: Ping Pong venues:",
      pingPongVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      pingPongVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        pingPongVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getPingPongLocationsForSitemap: Ping Pong cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getPingPongLocationsForSitemap: Final ping pong locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching ping pong locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have laser tag
async function getLaserTagStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getLaserTagStatesForSitemap: Total venues:", venues.length);

    const laserTagVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Laser Tag"),
    );
    console.log(
      "getLaserTagStatesForSitemap: Laser Tag venues:",
      laserTagVenues.length,
    );

    const statesSet = new Set(
      laserTagVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getLaserTagStatesForSitemap: Unique laser tag states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching laser tag states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have laser tag
async function getLaserTagLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getLaserTagLocationsForSitemap: Total venues:",
      venues.length,
    );

    const laserTagVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Laser Tag"),
    );
    console.log(
      "getLaserTagLocationsForSitemap: Laser Tag venues:",
      laserTagVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      laserTagVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        laserTagVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getLaserTagLocationsForSitemap: Laser Tag cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getLaserTagLocationsForSitemap: Final laser tag locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching laser tag locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have karaoke
async function getKaraokeStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getKaraokeStatesForSitemap: Total venues:", venues.length);

    const karaokeVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Karaoke"),
    );
    console.log(
      "getKaraokeStatesForSitemap: Karaoke venues:",
      karaokeVenues.length,
    );

    const statesSet = new Set(
      karaokeVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getKaraokeStatesForSitemap: Unique karaoke states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching karaoke states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have karaoke
async function getKaraokeLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getKaraokeLocationsForSitemap: Total venues:",
      venues.length,
    );

    const karaokeVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Karaoke"),
    );
    console.log(
      "getKaraokeLocationsForSitemap: Karaoke venues:",
      karaokeVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      karaokeVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        karaokeVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getKaraokeLocationsForSitemap: Karaoke cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getKaraokeLocationsForSitemap: Final karaoke locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching karaoke locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have tournaments
async function getTournamentsStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getTournamentsStatesForSitemap: Total venues:", venues.length);

    const tournamentsVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Tournaments"),
    );
    console.log(
      "getTournamentsStatesForSitemap: Tournaments venues:",
      tournamentsVenues.length,
    );

    const statesSet = new Set(
      tournamentsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getTournamentsStatesForSitemap: Unique tournaments states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching tournaments states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have tournaments
async function getTournamentsLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getTournamentsLocationsForSitemap: Total venues:",
      venues.length,
    );

    const tournamentsVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Tournaments"),
    );
    console.log(
      "getTournamentsLocationsForSitemap: Tournaments venues:",
      tournamentsVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      tournamentsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        tournamentsVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getTournamentsLocationsForSitemap: Tournaments cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getTournamentsLocationsForSitemap: Final tournaments locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching tournaments locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have bowling lessons
async function getLessonsStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getLessonsStatesForSitemap: Total venues:", venues.length);

    const lessonsVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Bowling Lessons"),
    );
    console.log(
      "getLessonsStatesForSitemap: Bowling Lessons venues:",
      lessonsVenues.length,
    );

    const statesSet = new Set(
      lessonsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getLessonsStatesForSitemap: Unique bowling lessons states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching bowling lessons states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have bowling lessons
async function getLessonsLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getLessonsLocationsForSitemap: Total venues:",
      venues.length,
    );

    const lessonsVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Bowling Lessons"),
    );
    console.log(
      "getLessonsLocationsForSitemap: Bowling Lessons venues:",
      lessonsVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      lessonsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        lessonsVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getLessonsLocationsForSitemap: Bowling Lessons cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getLessonsLocationsForSitemap: Final bowling lessons locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching bowling lessons locations for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have corporate events
async function getCorporateLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getCorporateLocationsForSitemap: Total venues:",
      venues.length,
    );

    const corporateVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Corporate Events"),
    );
    console.log(
      "getCorporateLocationsForSitemap: Corporate Events venues:",
      corporateVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      corporateVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        corporateVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getCorporateLocationsForSitemap: Corporate Events cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getCorporateLocationsForSitemap: Final corporate events locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching corporate events locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have corporate events
async function getCorporateStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getCorporateStatesForSitemap: Total venues:", venues.length);

    const corporateVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Corporate Events"),
    );
    console.log(
      "getCorporateStatesForSitemap: Corporate Events venues:",
      corporateVenues.length,
    );

    const statesSet = new Set(
      corporateVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getCorporateStatesForSitemap: Unique corporate events states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching corporate events states for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have escape rooms
async function getEscapeRoomsStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getEscapeRoomsStatesForSitemap: Total venues:", venues.length);

    const escapeRoomsVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Escape Rooms"),
    );
    console.log(
      "getEscapeRoomsStatesForSitemap: Escape Rooms venues:",
      escapeRoomsVenues.length,
    );

    const statesSet = new Set(
      escapeRoomsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getEscapeRoomsStatesForSitemap: Unique escape rooms states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching escape rooms states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have escape rooms
async function getEscapeRoomsLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getEscapeRoomsLocationsForSitemap: Total venues:",
      venues.length,
    );

    const escapeRoomsVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Escape Rooms"),
    );
    console.log(
      "getEscapeRoomsLocationsForSitemap: Escape Rooms venues:",
      escapeRoomsVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      escapeRoomsVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        escapeRoomsVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getEscapeRoomsLocationsForSitemap: Escape Rooms cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getEscapeRoomsLocationsForSitemap: Final escape rooms locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching escape rooms locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have duckpin bowling
async function getDuckpinBowlingStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getDuckpinBowlingStatesForSitemap: Total venues:", venues.length);

    const duckpinBowlingVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Duckpin Bowling"),
    );
    console.log(
      "getDuckpinBowlingStatesForSitemap: Duckpin Bowling venues:",
      duckpinBowlingVenues.length,
    );

    const statesSet = new Set(
      duckpinBowlingVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getDuckpinBowlingStatesForSitemap: Unique duckpin bowling states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching duckpin bowling states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have duckpin bowling
async function getDuckpinBowlingLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getDuckpinBowlingLocationsForSitemap: Total venues:",
      venues.length,
    );

    const duckpinBowlingVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Duckpin Bowling"),
    );
    console.log(
      "getDuckpinBowlingLocationsForSitemap: Duckpin Bowling venues:",
      duckpinBowlingVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      duckpinBowlingVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        duckpinBowlingVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getDuckpinBowlingLocationsForSitemap: Duckpin Bowling cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getDuckpinBowlingLocationsForSitemap: Final duckpin bowling locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching duckpin bowling locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have candlepin bowling
async function getCandlepinBowlingStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log("getCandlepinBowlingStatesForSitemap: Total venues:", venues.length);

    const candlepinBowlingVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Candlepin Bowling"),
    );
    console.log(
      "getCandlepinBowlingStatesForSitemap: Candlepin Bowling venues:",
      candlepinBowlingVenues.length,
    );

    const statesSet = new Set(
      candlepinBowlingVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getCandlepinBowlingStatesForSitemap: Unique candlepin bowling states:",
      states,
    );

    return states;
  } catch (error) {
    console.error("Error fetching candlepin bowling states for sitemap:", error);
    return [];
  }
}

// Helper function to get cities with venues that have candlepin bowling
async function getCandlepinBowlingLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getCandlepinBowlingLocationsForSitemap: Total venues:",
      venues.length,
    );

    const candlepinBowlingVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Candlepin Bowling"),
    );
    console.log(
      "getCandlepinBowlingLocationsForSitemap: Candlepin Bowling venues:",
      candlepinBowlingVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      candlepinBowlingVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        candlepinBowlingVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getCandlepinBowlingLocationsForSitemap: Candlepin Bowling cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getCandlepinBowlingLocationsForSitemap: Final candlepin bowling locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error("Error fetching candlepin bowling locations for sitemap:", error);
    return [];
  }
}

// Helper function to get states with venues that have wheelchair accessible amenity
async function getWheelchairAccessibleStatesForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getWheelchairAccessibleStatesForSitemap: Total venues:",
      venues.length,
    );

    const wheelchairAccessibleVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Wheelchair Accessible"),
    );
    console.log(
      "getWheelchairAccessibleStatesForSitemap: Wheelchair Accessible venues:",
      wheelchairAccessibleVenues.length,
    );

    const statesSet = new Set(
      wheelchairAccessibleVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);
    console.log(
      "getWheelchairAccessibleStatesForSitemap: Unique wheelchair accessible states:",
      states,
    );
    return states;
  } catch (error) {
    console.error(
      "Error fetching wheelchair accessible states for sitemap:",
      error,
    );
    return [];
  }
}

// Helper function to get cities with venues that have wheelchair accessible amenity
async function getWheelchairAccessibleLocationsForSitemap() {
  try {
    const venues = await getVenuesForSitemap();
    console.log(
      "getWheelchairAccessibleLocationsForSitemap: Total venues:",
      venues.length,
    );

    const wheelchairAccessibleVenues = venues.filter(
      (v) => v.amenities && v.amenities.includes("Wheelchair Accessible"),
    );
    console.log(
      "getWheelchairAccessibleLocationsForSitemap: Wheelchair Accessible venues:",
      wheelchairAccessibleVenues.length,
    );

    const locations = [];
    const statesSet = new Set(
      wheelchairAccessibleVenues.map((v) => v.state).filter(Boolean),
    );
    const states = Array.from(statesSet);

    for (const state of states) {
      const citiesSet = new Set(
        wheelchairAccessibleVenues
          .filter((v) => v.state === state)
          .map((v) => v.city)
          .filter(Boolean),
      );
      const cities = Array.from(citiesSet);
      console.log(
        `getWheelchairAccessibleLocationsForSitemap: Wheelchair Accessible cities in ${state}:`,
        cities,
      );

      for (const city of cities) {
        locations.push({ state, city });
      }
    }

    console.log(
      "getWheelchairAccessibleLocationsForSitemap: Final wheelchair accessible locations:",
      locations.length,
    );
    return locations;
  } catch (error) {
    console.error(
      "Error fetching wheelchair accessible locations for sitemap:",
      error,
    );
    return [];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check route for debugging
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Sitemap.xml route
  app.get("/sitemap.xml", async (req, res) => {
    try {
      res.header("Content-Type", "application/xml");
      const acceptEncodingRaw = req.headers["accept-encoding"];
      const acceptEncoding = (Array.isArray(acceptEncodingRaw)
        ? acceptEncodingRaw.join(", ")
        : acceptEncodingRaw || ""
      ).toLowerCase();
      const useGzip = acceptEncoding.includes("gzip");

      // Always use production domain for sitemap (env can be wrong when behind Railway proxy)
      const hostname = "https://www.bowlingalleys.io";
      const smStream = new SitemapStream({ hostname });
      const pipeline = useGzip ? smStream.pipe(createGzip()) : smStream;
      if (useGzip) res.header("Content-Encoding", "gzip");

      // Static pages
      smStream.write({
        url: "/",
        changefreq: "daily",
        priority: 1.0,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/locations",
        changefreq: "weekly",
        priority: 0.9,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/blog",
        changefreq: "daily",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Owner partnership landing page
      smStream.write({
        url: "/owner",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Experiences hub page
      smStream.write({
        url: "/experiences",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main bowling leagues page
      smStream.write({
        url: "/bowling-leagues",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main cosmic bowling page
      smStream.write({
        url: "/cosmic-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main open bowling page
      smStream.write({
        url: "/open-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main specials page
      smStream.write({
        url: "/specials",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Kids bowling page
      smStream.write({
        url: "/kids-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main bowling birthday party page
      smStream.write({
        url: "/bowling-birthday-party",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main arcade bowling page
      smStream.write({
        url: "/arcade-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main bowling lessons page
      smStream.write({
        url: "/bowling-lessons",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main corporate events page
      smStream.write({
        url: "/corporate-events",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Main senior bowling page
      smStream.write({
        url: "/senior-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // City hub pages
      smStream.write({
        url: "/best-bowling-in-el-paso",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-charleston-sc",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-summerville-sc",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-denver",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-alleys-in-el-cajon",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-ashburn-va",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-atlanta",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-houston",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-chicago",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-los-angeles",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-baltimore",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-boston",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-las-vegas",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-new-york",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-phoenix",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-san-francisco",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-san-diego",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-seattle",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-miami",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-colorado-springs",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      smStream.write({
        url: "/best-bowling-in-dallas-fort-worth",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Venue pages
      const venues = await getVenuesForSitemap();
      venues.forEach((venue) => {
        smStream.write({
          url: `/venue/${venue.id}`,
          lastmod: venue.updatedAt
            ? new Date(venue.updatedAt.seconds * 1000).toISOString()
            : new Date().toISOString(),
          changefreq: "weekly",
          priority: 0.7,
        });
      });

      // Blog post pages
      const blogPosts = await getBlogPostsForSitemap();
      blogPosts.forEach((post) => {
        smStream.write({
          url: `/blog/${post.slug}`,
          lastmod: post.updated,
          changefreq: "monthly",
          priority: 0.6,
        });
      });

      // Owner profile pages
      const ownerProfiles = await getOwnerProfilesForSitemap();
      ownerProfiles.forEach((owner: any) => {
        smStream.write({
          url: `/owner/${owner.slug}`,
          lastmod: owner.updatedAt
            ? new Date(owner.updatedAt.seconds * 1000).toISOString()
            : new Date().toISOString(),
          changefreq: "weekly",
          priority: 0.7,
        });
      });

      // Main locations page
      smStream.write({
        url: "/locations",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Location pages for state/city filtering
      const { states, locations } = await getLocationDataForSitemap();
      console.log("Sitemap generation: States found:", states.length, states);
      console.log("Sitemap generation: Locations found:", locations.length);

      // Add state-specific location pages
      const validStates = states.filter((state): state is string =>
        Boolean(state),
      );
      console.log(
        "Sitemap generation: Valid states:",
        validStates.length,
        validStates,
      );

      validStates.forEach((state) => {
        const stateUrl = `/locations/${encodeURIComponent(state)}`;
        console.log("Adding state URL to sitemap:", stateUrl);
        smStream.write({
          url: stateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add state+city specific location pages
      const validLocations = locations.filter(
        (location) => location.state && location.city,
      );
      console.log(
        "Sitemap generation: Valid locations:",
        validLocations.length,
      );

      validLocations.forEach((location) => {
        const cityUrl = `/locations/${encodeURIComponent(location.state!)}/${encodeURIComponent(location.city!)}`;
        console.log("Adding city URL to sitemap:", cityUrl);
        smStream.write({
          url: cityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Bowling leagues pages - only for states and cities with leagues venues
      const leagueStates = await getLeagueStatesForSitemap();
      console.log(
        "Sitemap generation: League states found:",
        leagueStates.length,
        leagueStates,
      );

      // Add state-specific bowling leagues pages
      leagueStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const leagueStateUrl = `/bowling-leagues/${encodeURIComponent(stateSlug)}`;
        console.log("Adding league state URL to sitemap:", leagueStateUrl);
        smStream.write({
          url: leagueStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific bowling leagues pages
      const leagueLocations = await getLeagueLocationsForSitemap();
      console.log(
        "Sitemap generation: League locations found:",
        leagueLocations.length,
      );

      leagueLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const leagueCityUrl = `/bowling-leagues/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding league city URL to sitemap:", leagueCityUrl);
        smStream.write({
          url: leagueCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Cosmic bowling pages - only for states and cities with cosmic bowling venues
      const cosmicStates = await getCosmicStatesForSitemap();
      console.log(
        "Sitemap generation: Cosmic states found:",
        cosmicStates.length,
        cosmicStates,
      );

      // Add state-specific cosmic bowling pages
      cosmicStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const cosmicStateUrl = `/cosmic-bowling/${encodeURIComponent(stateSlug)}`;
        console.log("Adding cosmic state URL to sitemap:", cosmicStateUrl);
        smStream.write({
          url: cosmicStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific cosmic bowling pages
      const cosmicLocations = await getCosmicLocationsForSitemap();
      console.log(
        "Sitemap generation: Cosmic locations found:",
        cosmicLocations.length,
      );

      cosmicLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const cosmicCityUrl = `/cosmic-bowling/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding cosmic city URL to sitemap:", cosmicCityUrl);
        smStream.write({
          url: cosmicCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Open bowling pages - only for states and cities with open bowling venues
      const openBowlingStates = await getOpenBowlingStatesForSitemap();
      console.log(
        "Sitemap generation: Open Bowling states found:",
        openBowlingStates.length,
        openBowlingStates,
      );

      // Add state-specific open bowling pages
      openBowlingStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const openBowlingStateUrl = `/open-bowling/${encodeURIComponent(stateSlug)}`;
        console.log("Adding open bowling state URL to sitemap:", openBowlingStateUrl);
        smStream.write({
          url: openBowlingStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific open bowling pages
      const openBowlingLocations = await getOpenBowlingLocationsForSitemap();
      console.log(
        "Sitemap generation: Open Bowling locations found:",
        openBowlingLocations.length,
      );

      openBowlingLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const openBowlingCityUrl = `/open-bowling/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding open bowling city URL to sitemap:", openBowlingCityUrl);
        smStream.write({
          url: openBowlingCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Specials pages - only for states and cities with venues that have specials
      const specialsStates = await getSpecialsStatesForSitemap();
      console.log(
        "Sitemap generation: Specials states found:",
        specialsStates.length,
        specialsStates,
      );

      // Add state-specific specials pages
      specialsStates.forEach((state) => {
        if (!state) return;
        const stateSlug = state.replace(/\s+/g, "-");
        const specialsStateUrl = `/specials/${encodeURIComponent(stateSlug)}`;
        console.log("Adding specials state URL to sitemap:", specialsStateUrl);
        smStream.write({
          url: specialsStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific specials pages
      const specialsLocations = await getSpecialsLocationsForSitemap();
      console.log(
        "Sitemap generation: Specials locations found:",
        specialsLocations.length,
      );

      specialsLocations.forEach((location) => {
        const stateSlug = location.state.replace(/\s+/g, "-");
        const citySlug = location.city.toLowerCase().replace(/\s+/g, "-");
        const specialsCityUrl = `/specials/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding specials city URL to sitemap:", specialsCityUrl);
        smStream.write({
          url: specialsCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Birthday party pages - only for states and cities with party venues
      const partyStates = await getPartyStatesForSitemap();
      console.log(
        "Sitemap generation: Party states found:",
        partyStates.length,
        partyStates,
      );

      // Add state-specific birthday party pages
      partyStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const partyStateUrl = `/bowling-birthday-party/${encodeURIComponent(stateSlug)}`;
        console.log("Adding party state URL to sitemap:", partyStateUrl);
        smStream.write({
          url: partyStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific birthday party pages
      const partyLocations = await getPartyLocationsForSitemap();
      console.log(
        "Sitemap generation: Party locations found:",
        partyLocations.length,
      );

      partyLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const partyCityUrl = `/bowling-birthday-party/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding party city URL to sitemap:", partyCityUrl);
        smStream.write({
          url: partyCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Arcade bowling pages - only for states and cities with arcade venues
      const arcadeStates = await getArcadeStatesForSitemap();
      console.log(
        "Sitemap generation: Arcade states found:",
        arcadeStates.length,
        arcadeStates,
      );

      // Add state-specific arcade bowling pages
      arcadeStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const arcadeStateUrl = `/arcade-bowling/${encodeURIComponent(stateSlug)}`;
        console.log("Adding arcade state URL to sitemap:", arcadeStateUrl);
        smStream.write({
          url: arcadeStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific arcade bowling pages
      const arcadeLocations = await getArcadeLocationsForSitemap();
      console.log(
        "Sitemap generation: Arcade locations found:",
        arcadeLocations.length,
      );

      arcadeLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const arcadeCityUrl = `/arcade-bowling/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding arcade city URL to sitemap:", arcadeCityUrl);
        smStream.write({
          url: arcadeCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Bowling restaurant pages - main page
      smStream.write({
        url: "/bowling-restaurant",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Bowling restaurant pages - only for states and cities with restaurant venues
      const restaurantStates = await getRestaurantStatesForSitemap();
      console.log(
        "Sitemap generation: Restaurant states found:",
        restaurantStates.length,
        restaurantStates,
      );

      // Add state-specific restaurant bowling pages
      restaurantStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const restaurantStateUrl = `/bowling-restaurant/${encodeURIComponent(stateSlug)}`;
        console.log(
          "Adding restaurant state URL to sitemap:",
          restaurantStateUrl,
        );
        smStream.write({
          url: restaurantStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific restaurant bowling pages
      const restaurantLocations = await getRestaurantLocationsForSitemap();
      console.log(
        "Sitemap generation: Restaurant locations found:",
        restaurantLocations.length,
      );

      restaurantLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const restaurantCityUrl = `/bowling-restaurant/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log(
          "Adding restaurant city URL to sitemap:",
          restaurantCityUrl,
        );
        smStream.write({
          url: restaurantCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Bowling bar pages - main page
      smStream.write({
        url: "/bowling-bar",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Bowling bar pages - only for states and cities with bar venues
      const barStates = await getBarStatesForSitemap();
      console.log(
        "Sitemap generation: Bar states found:",
        barStates.length,
        barStates,
      );

      // Add state-specific bar bowling pages
      barStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const barStateUrl = `/bowling-bar/${encodeURIComponent(stateSlug)}`;
        console.log("Adding bar state URL to sitemap:", barStateUrl);
        smStream.write({
          url: barStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific bar bowling pages
      const barLocations = await getBarLocationsForSitemap();
      console.log(
        "Sitemap generation: Bar locations found:",
        barLocations.length,
      );

      barLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const barCityUrl = `/bowling-bar/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding bar city URL to sitemap:", barCityUrl);
        smStream.write({
          url: barCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Sports bar pages - main page
      smStream.write({
        url: "/sports-bar",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Sports bar pages - only for states and cities with sports bar venues
      const sportsBarStates = await getSportsBarStatesForSitemap();
      console.log(
        "Sitemap generation: Sports bar states found:",
        sportsBarStates.length,
        sportsBarStates,
      );

      // Add state-specific sports bar bowling pages
      sportsBarStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const sportsBarStateUrl = `/sports-bar/${encodeURIComponent(stateSlug)}`;
        console.log("Adding sports bar state URL to sitemap:", sportsBarStateUrl);
        smStream.write({
          url: sportsBarStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific sports bar bowling pages
      const sportsBarLocations = await getSportsBarLocationsForSitemap();
      console.log(
        "Sitemap generation: Sports bar locations found:",
        sportsBarLocations.length,
      );

      sportsBarLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const sportsBarCityUrl = `/sports-bar/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding sports bar city URL to sitemap:", sportsBarCityUrl);
        smStream.write({
          url: sportsBarCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Snack bar pages - main page
      smStream.write({
        url: "/snack-bar",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Snack bar pages - only for states and cities with snack bar venues
      const snackBarStates = await getSnackBarStatesForSitemap();
      console.log(
        "Sitemap generation: Snack bar states found:",
        snackBarStates.length,
        snackBarStates,
      );

      // Add state-specific snack bar pages
      snackBarStates.forEach((state) => {
        if (!state) return;
        const stateSlug = state.replace(/\s+/g, "-");
        const snackBarStateUrl = `/snack-bar/${encodeURIComponent(stateSlug)}`;
        console.log("Adding snack bar state URL to sitemap:", snackBarStateUrl);
        smStream.write({
          url: snackBarStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific snack bar pages
      const snackBarLocations = await getSnackBarLocationsForSitemap();
      console.log(
        "Sitemap generation: Snack bar locations found:",
        snackBarLocations.length,
      );

      snackBarLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const snackBarCityUrl = `/snack-bar/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding snack bar city URL to sitemap:", snackBarCityUrl);
        smStream.write({
          url: snackBarCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Bowling billiards pages - main page
      smStream.write({
        url: "/bowling-billiards",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Bowling billiards pages - only for states and cities with billiards venues
      const billiardsStates = await getBilliardsStatesForSitemap();
      console.log(
        "Sitemap generation: Billiards states found:",
        billiardsStates.length,
        billiardsStates,
      );

      // Add state-specific billiards bowling pages
      billiardsStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const billiardsStateUrl = `/bowling-billiards/${encodeURIComponent(stateSlug)}`;
        console.log(
          "Adding billiards state URL to sitemap:",
          billiardsStateUrl,
        );
        smStream.write({
          url: billiardsStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific billiards bowling pages
      const billiardsLocations = await getBilliardsLocationsForSitemap();
      console.log(
        "Sitemap generation: Billiards locations found:",
        billiardsLocations.length,
      );

      billiardsLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const billiardsCityUrl = `/bowling-billiards/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding billiards city URL to sitemap:", billiardsCityUrl);
        smStream.write({
          url: billiardsCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Ping Pong pages - main page
      smStream.write({
        url: "/ping-pong",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Ping Pong pages - only for states and cities with ping pong venues
      const pingPongStates = await getPingPongStatesForSitemap();
      console.log(
        "Sitemap generation: Ping Pong states found:",
        pingPongStates.length,
        pingPongStates,
      );

      // Add state-specific ping pong pages
      pingPongStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const pingPongStateUrl = `/ping-pong/${encodeURIComponent(stateSlug)}`;
        console.log(
          "Adding ping pong state URL to sitemap:",
          pingPongStateUrl,
        );
        smStream.write({
          url: pingPongStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific ping pong pages
      const pingPongLocations = await getPingPongLocationsForSitemap();
      console.log(
        "Sitemap generation: Ping Pong locations found:",
        pingPongLocations.length,
      );

      pingPongLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const pingPongCityUrl = `/ping-pong/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding ping pong city URL to sitemap:", pingPongCityUrl);
        smStream.write({
          url: pingPongCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Pro Shop pages - main page
      smStream.write({
        url: "/pro-shop",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Pro Shop pages - only for states and cities with pro shop venues
      const proShopStates = await getProShopStatesForSitemap();
      console.log(
        "Sitemap generation: Pro Shop states found:",
        proShopStates.length,
        proShopStates,
      );

      // Add state-specific pro shop pages
      proShopStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const proShopStateUrl = `/pro-shop/${encodeURIComponent(stateSlug)}`;
        console.log("Adding pro shop state URL to sitemap:", proShopStateUrl);
        smStream.write({
          url: proShopStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific pro shop pages
      const proShopLocations = await getProShopLocationsForSitemap();
      console.log(
        "Sitemap generation: Pro Shop locations found:",
        proShopLocations.length,
      );

      proShopLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const proShopCityUrl = `/pro-shop/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding pro shop city URL to sitemap:", proShopCityUrl);
        smStream.write({
          url: proShopCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Batting Cages pages - main page
      smStream.write({
        url: "/batting-cages",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Batting Cages pages - only for states and cities with batting cages venues
      const battingCagesStates = await getBattingCagesStatesForSitemap();
      console.log(
        "Sitemap generation: Batting Cages states found:",
        battingCagesStates.length,
        battingCagesStates,
      );

      // Add state-specific batting cages pages
      battingCagesStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const battingCagesStateUrl = `/batting-cages/${encodeURIComponent(stateSlug)}`;
        console.log("Adding batting cages state URL to sitemap:", battingCagesStateUrl);
        smStream.write({
          url: battingCagesStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific batting cages pages
      const battingCagesLocations = await getBattingCagesLocationsForSitemap();
      console.log(
        "Sitemap generation: Batting Cages locations found:",
        battingCagesLocations.length,
      );

      battingCagesLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const battingCagesCityUrl = `/batting-cages/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding batting cages city URL to sitemap:", battingCagesCityUrl);
        smStream.write({
          url: battingCagesCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Laser Tag pages - main page
      smStream.write({
        url: "/laser-tag",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Laser Tag pages - only for states and cities with laser tag venues
      const laserTagStates = await getLaserTagStatesForSitemap();
      console.log(
        "Sitemap generation: Laser Tag states found:",
        laserTagStates.length,
        laserTagStates,
      );

      // Add state-specific laser tag pages
      laserTagStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const laserTagStateUrl = `/laser-tag/${encodeURIComponent(stateSlug)}`;
        console.log("Adding laser tag state URL to sitemap:", laserTagStateUrl);
        smStream.write({
          url: laserTagStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific laser tag pages
      const laserTagLocations = await getLaserTagLocationsForSitemap();
      console.log(
        "Sitemap generation: Laser Tag locations found:",
        laserTagLocations.length,
      );

      laserTagLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const laserTagCityUrl = `/laser-tag/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding laser tag city URL to sitemap:", laserTagCityUrl);
        smStream.write({
          url: laserTagCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Karaoke Bowling pages - main page
      smStream.write({
        url: "/karaoke-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Karaoke Bowling pages - only for states and cities with karaoke venues
      const karaokeStates = await getKaraokeStatesForSitemap();
      console.log(
        "Sitemap generation: Karaoke states found:",
        karaokeStates.length,
        karaokeStates,
      );

      // Add state-specific karaoke pages
      karaokeStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const karaokeStateUrl = `/karaoke-bowling/${encodeURIComponent(stateSlug)}`;
        console.log("Adding karaoke state URL to sitemap:", karaokeStateUrl);
        smStream.write({
          url: karaokeStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific karaoke pages
      const karaokeLocations = await getKaraokeLocationsForSitemap();
      console.log(
        "Sitemap generation: Karaoke locations found:",
        karaokeLocations.length,
      );

      karaokeLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const karaokeCityUrl = `/karaoke-bowling/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding karaoke city URL to sitemap:", karaokeCityUrl);
        smStream.write({
          url: karaokeCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Duckpin Bowling pages - main page
      smStream.write({
        url: "/duckpin-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Duckpin Bowling pages - only for states and cities with duckpin bowling venues
      const duckpinBowlingStates = await getDuckpinBowlingStatesForSitemap();
      console.log(
        "Sitemap generation: Duckpin Bowling states found:",
        duckpinBowlingStates.length,
        duckpinBowlingStates,
      );

      // Add state-specific duckpin bowling pages
      duckpinBowlingStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const duckpinBowlingStateUrl = `/duckpin-bowling/${encodeURIComponent(stateSlug)}`;
        console.log("Adding duckpin bowling state URL to sitemap:", duckpinBowlingStateUrl);
        smStream.write({
          url: duckpinBowlingStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific duckpin bowling pages
      const duckpinBowlingLocations = await getDuckpinBowlingLocationsForSitemap();
      console.log(
        "Sitemap generation: Duckpin Bowling locations found:",
        duckpinBowlingLocations.length,
      );

      duckpinBowlingLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const duckpinBowlingCityUrl = `/duckpin-bowling/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding duckpin bowling city URL to sitemap:", duckpinBowlingCityUrl);
        smStream.write({
          url: duckpinBowlingCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Candlepin Bowling pages - main page
      smStream.write({
        url: "/candlepin-bowling",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Candlepin Bowling pages - only for states and cities with candlepin bowling venues
      const candlepinBowlingStates = await getCandlepinBowlingStatesForSitemap();
      console.log(
        "Sitemap generation: Candlepin Bowling states found:",
        candlepinBowlingStates.length,
        candlepinBowlingStates,
      );

      // Add state-specific candlepin bowling pages
      candlepinBowlingStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const candlepinBowlingStateUrl = `/candlepin-bowling/${encodeURIComponent(stateSlug)}`;
        console.log("Adding candlepin bowling state URL to sitemap:", candlepinBowlingStateUrl);
        smStream.write({
          url: candlepinBowlingStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific candlepin bowling pages
      const candlepinBowlingLocations = await getCandlepinBowlingLocationsForSitemap();
      console.log(
        "Sitemap generation: Candlepin Bowling locations found:",
        candlepinBowlingLocations.length,
      );

      candlepinBowlingLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const candlepinBowlingCityUrl = `/candlepin-bowling/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding candlepin bowling city URL to sitemap:", candlepinBowlingCityUrl);
        smStream.write({
          url: candlepinBowlingCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Wheelchair Accessible pages - main page
      smStream.write({
        url: "/wheelchair-accessible",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Wheelchair Accessible pages - only for states and cities with wheelchair accessible venues
      const wheelchairAccessibleStates = await getWheelchairAccessibleStatesForSitemap();
      console.log(
        "Sitemap generation: Wheelchair Accessible states found:",
        wheelchairAccessibleStates.length,
        wheelchairAccessibleStates,
      );

      // Add state-specific wheelchair accessible pages
      wheelchairAccessibleStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const wheelchairAccessibleStateUrl = `/wheelchair-accessible/${encodeURIComponent(stateSlug)}`;
        console.log("Adding wheelchair accessible state URL to sitemap:", wheelchairAccessibleStateUrl);
        smStream.write({
          url: wheelchairAccessibleStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific wheelchair accessible pages
      const wheelchairAccessibleLocations = await getWheelchairAccessibleLocationsForSitemap();
      console.log(
        "Sitemap generation: Wheelchair Accessible locations found:",
        wheelchairAccessibleLocations.length,
      );

      wheelchairAccessibleLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const wheelchairAccessibleCityUrl = `/wheelchair-accessible/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding wheelchair accessible city URL to sitemap:", wheelchairAccessibleCityUrl);
        smStream.write({
          url: wheelchairAccessibleCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Escape Rooms pages - main page
      smStream.write({
        url: "/escape-rooms",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      // Escape Rooms pages - only for states and cities with escape rooms venues
      const escapeRoomsStates = await getEscapeRoomsStatesForSitemap();
      console.log(
        "Sitemap generation: Escape Rooms states found:",
        escapeRoomsStates.length,
        escapeRoomsStates,
      );

      // Add state-specific escape rooms pages
      escapeRoomsStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const escapeRoomsStateUrl = `/escape-rooms/${encodeURIComponent(stateSlug)}`;
        console.log("Adding escape rooms state URL to sitemap:", escapeRoomsStateUrl);
        smStream.write({
          url: escapeRoomsStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific escape rooms pages
      const escapeRoomsLocations = await getEscapeRoomsLocationsForSitemap();
      console.log(
        "Sitemap generation: Escape Rooms locations found:",
        escapeRoomsLocations.length,
      );

      escapeRoomsLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const escapeRoomsCityUrl = `/escape-rooms/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding escape rooms city URL to sitemap:", escapeRoomsCityUrl);
        smStream.write({
          url: escapeRoomsCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Bowling cost pages - main page and all states/cities with pricing data
      smStream.write({
        url: "/bowling-cost",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });

      const pricingStates = await getPricingStatesForSitemap();
      console.log(
        "Sitemap generation: Pricing states found:",
        pricingStates.length,
        pricingStates,
      );

      // Add state-specific bowling cost pages
      pricingStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const costStateUrl = `/bowling-cost/${encodeURIComponent(stateSlug)}`;
        console.log("Adding cost state URL to sitemap:", costStateUrl);
        smStream.write({
          url: costStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific bowling cost pages
      const pricingLocations = await getPricingLocationsForSitemap();
      console.log(
        "Sitemap generation: Pricing locations found:",
        pricingLocations.length,
      );

      pricingLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const costCityUrl = `/bowling-cost/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding cost city URL to sitemap:", costCityUrl);
        smStream.write({
          url: costCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Bowling Lessons pages - only for states and cities with bowling lessons venues
      const lessonsStates = await getLessonsStatesForSitemap();
      console.log(
        "Sitemap generation: Bowling Lessons states found:",
        lessonsStates.length,
        lessonsStates,
      );

      // Add state-specific bowling lessons pages
      lessonsStates.forEach((state) => {
        if (!state) return; // Safety check for TypeScript
        const stateSlug = state.replace(/\s+/g, "-");
        const lessonsStateUrl = `/bowling-lessons/${encodeURIComponent(stateSlug)}`;
        console.log("Adding bowling lessons state URL to sitemap:", lessonsStateUrl);
        smStream.write({
          url: lessonsStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific bowling lessons pages
      const lessonsLocations = await getLessonsLocationsForSitemap();
      console.log(
        "Sitemap generation: Bowling Lessons locations found:",
        lessonsLocations.length,
      );

      lessonsLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const lessonsCityUrl = `/bowling-lessons/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding bowling lessons city URL to sitemap:", lessonsCityUrl);
        smStream.write({
          url: lessonsCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Add state-specific corporate events pages
      const corporateStates = await getCorporateStatesForSitemap();
      console.log(
        "Sitemap generation: Corporate Events states found:",
        corporateStates.length,
        corporateStates,
      );

      corporateStates.forEach((state) => {
        if (!state) return;
        const stateSlug = state.replace(/\s+/g, "-");
        const corporateStateUrl = `/corporate-events/${encodeURIComponent(stateSlug)}`;
        console.log("Adding corporate events state URL to sitemap:", corporateStateUrl);
        smStream.write({
          url: corporateStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific corporate events pages
      const corporateLocations = await getCorporateLocationsForSitemap();
      console.log(
        "Sitemap generation: Corporate Events locations found:",
        corporateLocations.length,
      );

      corporateLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const corporateCityUrl = `/corporate-events/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding corporate events city URL to sitemap:", corporateCityUrl);
        smStream.write({
          url: corporateCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      // Add base tournaments page
      smStream.write({
        url: "/tournaments",
        changefreq: "weekly",
        priority: 0.7,
        lastmod: new Date().toISOString(),
      });

      // Add state-specific tournaments pages
      const tournamentsStates = await getTournamentsStatesForSitemap();
      console.log(
        "Sitemap generation: Tournaments states found:",
        tournamentsStates.length,
        tournamentsStates,
      );

      tournamentsStates.forEach((state) => {
        if (!state) return;
        const stateSlug = state.replace(/\s+/g, "-");
        const tournamentsStateUrl = `/tournaments/${encodeURIComponent(stateSlug)}`;
        console.log("Adding tournaments state URL to sitemap:", tournamentsStateUrl);
        smStream.write({
          url: tournamentsStateUrl,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: new Date().toISOString(),
        });
      });

      // Add city-specific tournaments pages
      const tournamentsLocations = await getTournamentsLocationsForSitemap();
      console.log(
        "Sitemap generation: Tournaments locations found:",
        tournamentsLocations.length,
      );

      tournamentsLocations.forEach((location) => {
        const stateSlug = location.state!.replace(/\s+/g, "-");
        const citySlug = location.city!.toLowerCase().replace(/\s+/g, "-");
        const tournamentsCityUrl = `/tournaments/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}`;
        console.log("Adding tournaments city URL to sitemap:", tournamentsCityUrl);
        smStream.write({
          url: tournamentsCityUrl,
          changefreq: "weekly",
          priority: 0.5,
          lastmod: new Date().toISOString(),
        });
      });

      smStream.end();

      // Cache for 24 hours
      res.set("Cache-Control", "public, max-age=86400");

      const sitemap = await streamToPromise(pipeline);
      res.send(Buffer.isBuffer(sitemap) ? sitemap : Buffer.from(sitemap));
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).json({ error: "Failed to generate sitemap" });
    }
  });

  // Object storage routes for venue image uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );

      // Add security headers
      res.set({
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600", // 1 hour cache
      });

      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Protected endpoint: only authenticated admins can get upload URLs
  app.post(
    "/api/objects/upload",
    ...requireAuthenticatedAdmin,
    async (req, res) => {
      const objectStorageService = new ObjectStorageService();
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        return res.status(500).json({ error: "Failed to get upload URL" });
      }
    },
  );

  // Protected endpoint: authenticated users can upload profile pictures
  app.post(
    "/api/profile-picture/upload",
    authenticateToken,
    async (req, res) => {
      const objectStorageService = new ObjectStorageService();
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        return res.status(500).json({ error: "Failed to get upload URL" });
      }
    },
  );

  // Protected endpoint: authenticated users can set profile picture ACL
  app.put(
    "/api/profile-picture",
    authenticateToken,
    async (req: any, res) => {
      if (!req.body.imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      try {
        const objectStorageService = new ObjectStorageService();
        const rawPath = req.body.imageURL;

        // Validate that the uploaded file is an image
        try {
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(rawPath);
          const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
          const [metadata] = await objectFile.getMetadata();

          // Check content type
          if (!metadata.contentType || !metadata.contentType.startsWith("image/")) {
            return res.status(400).json({ error: "File must be an image" });
          }

          // Check file size (10MB limit)
          const fileSize = parseInt(String(metadata.size || "0"));
          if (fileSize > 10485760) {
            return res.status(400).json({ error: "File size must be less than 10MB" });
          }

          // Set ACL to public and return the normalized path
          const publicPath = await objectStorageService.trySetObjectEntityAclPolicy(
            rawPath,
            { visibility: "public", owner: req.user.uid }
          );
          
          res.json({ objectPath: publicPath });
        } catch (error) {
          console.error("Error accessing uploaded object:", error);
          if (error instanceof ObjectNotFoundError) {
            return res
              .status(400)
              .json({ error: "Image not found or upload failed" });
          }
          throw error;
        }
      } catch (error) {
        console.error("Error setting image ACL:", error);
        return res.status(500).json({ error: "Failed to process image" });
      }
    },
  );

  // Protected endpoint: authenticated users (venue owners) can upload venue images
  app.post(
    "/api/venue-images/upload",
    authenticateToken,
    async (req, res) => {
      const objectStorageService = new ObjectStorageService();
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        return res.status(500).json({ error: "Failed to get upload URL" });
      }
    },
  );

  // Protected endpoint: authenticated users (venue owners) can set venue image ACL
  app.put(
    "/api/venue-images",
    authenticateToken,
    async (req: any, res) => {
      if (!req.body.imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      try {
        const objectStorageService = new ObjectStorageService();
        const rawPath = req.body.imageURL;

        // Validate that the uploaded file is an image
        try {
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(rawPath);
          const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
          const [metadata] = await objectFile.getMetadata();

          // Check content type
          if (!metadata.contentType || !metadata.contentType.startsWith("image/")) {
            return res.status(400).json({ error: "File must be an image" });
          }

          // Check file size (10MB limit)
          const fileSize = parseInt(String(metadata.size || "0"));
          if (fileSize > 10485760) {
            return res.status(400).json({ error: "File size must be less than 10MB" });
          }

          // Set ACL to public and return the normalized path
          const publicPath = await objectStorageService.trySetObjectEntityAclPolicy(
            rawPath,
            { visibility: "public", owner: req.user.uid }
          );
          
          res.json({ objectPath: publicPath });
        } catch (error) {
          console.error("Error accessing uploaded object:", error);
          if (error instanceof ObjectNotFoundError) {
            return res
              .status(400)
              .json({ error: "Image not found or upload failed" });
          }
          throw error;
        }
      } catch (error) {
        console.error("Error setting image ACL:", error);
        return res.status(500).json({ error: "Failed to process image" });
      }
    },
  );

  // Admin-only endpoint: for admin panel venue image uploads
  app.post(
    "/api/admin/venue-images/upload",
    ...requireAuthenticatedAdmin,
    async (req, res) => {
      const objectStorageService = new ObjectStorageService();
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        return res.status(500).json({ error: "Failed to get upload URL" });
      }
    },
  );

  // Admin-only endpoint: for admin panel venue image ACL
  app.put(
    "/api/admin/venue-images",
    ...requireAuthenticatedAdmin,
    async (req, res) => {
      if (!req.body.imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      try {
        const objectStorageService = new ObjectStorageService();
        const objectPath = objectStorageService.normalizeObjectEntityPath(
          req.body.imageURL,
        );

        // Validate that the uploaded file is an image
        try {
          const objectFile =
            await objectStorageService.getObjectEntityFile(objectPath);
          const metadata = objectFile.metadata;

          // Check content type
          if (
            !metadata.contentType ||
            !metadata.contentType.startsWith("image/")
          ) {
            console.error(
              "Invalid content type for venue image:",
              metadata.contentType,
            );
            return res
              .status(400)
              .json({ error: "Only image files are allowed" });
          }

          // Check file size (10MB limit)
          const fileSize = parseInt(String(metadata.size || "0"));
          if (fileSize > 10485760) {
            // 10MB in bytes
            console.error("File too large for venue image:", fileSize);
            return res
              .status(400)
              .json({ error: "File size must be less than 10MB" });
          }
        } catch (error) {
          console.error("Error validating uploaded file:", error);
          return res
            .status(400)
            .json({ error: "Unable to validate uploaded file" });
        }

        // File is valid, make it public for venue images
        res.status(200).json({
          objectPath: objectPath,
        });
      } catch (error) {
        console.error("Error setting venue image:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Public endpoint: Get all venues (server-side cached)
  // This reduces Firebase reads by serving from server memory cache
  app.get("/api/venues", async (req, res) => {
    try {
      console.log(`[API] GET /api/venues - Request received from ${req.get('origin') || 'unknown'}`);
      const venues = await getVenuesForSitemap();
      
      // Set cache headers for browser caching (1 hour)
      res.setHeader('Cache-Control', 'public, max-age=3600');
      console.log(`[API] GET /api/venues - Returning ${venues.length} venues`);
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  // Public endpoint: Get single venue by ID (reads from Firestore, no cache so owner edits show right away)
  app.get("/api/venues/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const venue = await getVenueById(id);
      
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }
      
      res.setHeader('Cache-Control', 'private, no-cache');
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue:", error);
      res.status(500).json({ error: "Failed to fetch venue" });
    }
  });

  // Public endpoint: Get venues by state
  app.get("/api/venues/by-state/:state", async (req, res) => {
    try {
      const { state } = req.params;
      const venues = await getVenuesForSitemap();
      
      // Normalize state for comparison
      const normalizeState = (s: string) => s.toLowerCase().trim();
      const normalizedQueryState = normalizeState(state);
      
      const filteredVenues = venues.filter(venue => {
        if (!venue.state) return false;
        const venueState = normalizeState(venue.state);
        return venueState === normalizedQueryState || 
               (normalizedQueryState === "tx" && venueState === "texas") ||
               (normalizedQueryState === "texas" && venueState === "tx") ||
               (normalizedQueryState === "ca" && venueState === "california") ||
               (normalizedQueryState === "california" && venueState === "ca") ||
               (normalizedQueryState === "ny" && venueState === "new york") ||
               (normalizedQueryState === "new york" && venueState === "ny") ||
               (normalizedQueryState === "co" && venueState === "colorado") ||
               (normalizedQueryState === "colorado" && venueState === "co");
      });
      
      // Sort by rating
      filteredVenues.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(filteredVenues);
    } catch (error) {
      console.error("Error fetching venues by state:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  // Public endpoint: Get venues by state and city
  app.get("/api/venues/by-state-city/:state/:city", async (req, res) => {
    try {
      const { state, city } = req.params;
      const venues = await getVenuesForSitemap();
      
      const normalizeString = (s: string) => s.toLowerCase().trim();
      const normalizedQueryState = normalizeString(state);
      const normalizedQueryCity = normalizeString(city);
      
      const filteredVenues = venues.filter(venue => {
        if (!venue.state || !venue.city) return false;
        const venueState = normalizeString(venue.state);
        const venueCity = normalizeString(venue.city);
        
        const stateMatches = venueState === normalizedQueryState ||
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
      
      filteredVenues.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(filteredVenues);
    } catch (error) {
      console.error("Error fetching venues by state and city:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  // Public endpoint: Get top alleys
  app.get("/api/venues/top-alleys", async (req, res) => {
    try {
      const venues = await getVenuesForSitemap();
      const topAlleys = venues.filter(v => v.isTopAlley);
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(topAlleys);
    } catch (error) {
      console.error("Error fetching top alleys:", error);
      res.status(500).json({ error: "Failed to fetch top alleys" });
    }
  });

  // Public endpoint: Get founding partners
  app.get("/api/venues/founding-partners", async (req, res) => {
    try {
      const venues = await getVenuesForSitemap();
      const foundingPartners = venues.filter(v => v.isFoundingPartner);
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(foundingPartners);
    } catch (error) {
      console.error("Error fetching founding partners:", error);
      res.status(500).json({ error: "Failed to fetch founding partners" });
    }
  });

  // Public endpoint: Get venues by proximity
  app.get("/api/venues/by-proximity", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseFloat(req.query.radius as string) || 100;
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "lat and lng query parameters are required" });
      }
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const venues = await getVenuesForSitemap();
      const activeVenues = venues.filter(v => v.isActive !== false);
      
      // Calculate distance using Haversine formula
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
      };
      
      const venuesWithDistance = activeVenues
        .map(venue => {
          const venueLat = venue.location?.latitude || venue.lat;
          const venueLng = venue.location?.longitude || venue.lng;
          
          if (!venueLat || !venueLng) return null;
          
          const distance = calculateDistance(lat, lng, venueLat, venueLng);
          if (distance <= radius) {
            return { ...venue, distance };
          }
          return null;
        })
        .filter((v): v is VenueData & { distance: number } => v !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 9);
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(venuesWithDistance);
    } catch (error) {
      console.error("Error fetching venues by proximity:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  // Public endpoint: Get venue counts by state
  app.get("/api/venues/stats/by-state", async (req, res) => {
    try {
      const venues = await getVenuesForSitemap();
      const stateCounts: Record<string, number> = {};
      
      const stateToAbbr: Record<string, string> = {
        "alaska": "AK", "alabama": "AL", "arkansas": "AR", "arizona": "AZ",
        "california": "CA", "colorado": "CO", "connecticut": "CT",
        "district of columbia": "DC", "delaware": "DE", "florida": "FL", "georgia": "GA",
        "hawaii": "HI", "iowa": "IA", "idaho": "ID", "illinois": "IL", "indiana": "IN",
        "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "massachusetts": "MA",
        "maryland": "MD", "maine": "ME", "michigan": "MI", "minnesota": "MN", "missouri": "MO",
        "mississippi": "MS", "montana": "MT", "north carolina": "NC", "north dakota": "ND",
        "nebraska": "NE", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
        "nevada": "NV", "new york": "NY", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
        "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
        "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
        "virginia": "VA", "vermont": "VT", "washington": "WA", "wisconsin": "WI",
        "west virginia": "WV", "wyoming": "WY"
      };
      
      const normalizeState = (s: string): string => {
        const normalized = s.toLowerCase().trim();
        return stateToAbbr[normalized] || s.toUpperCase();
      };
      
      venues.forEach(venue => {
        if (venue.state) {
          const abbr = normalizeState(venue.state);
          stateCounts[abbr] = (stateCounts[abbr] || 0) + 1;
        }
      });
      
      const result = Object.entries(stateCounts).map(([abbr, count]) => ({
        abbreviation: abbr,
        count
      })).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(result);
    } catch (error) {
      console.error("Error fetching venue stats:", error);
      res.status(500).json({ error: "Failed to fetch venue stats" });
    }
  });

  // Admin endpoint: Create venue
  app.post("/api/venues", ...requireAuthenticatedAdmin, async (req: ExpressRequest, res: Response) => {
    try {
      const db = admin.firestore();
      const venueData = req.body;
      
      const docRef = await db.collection("venues").add({
        ...venueData,
        avgRating: 0,
        reviewCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Invalidate cache
      sitemapVenueCache.venues = [];
      sitemapVenueCache.timestamp = 0;
      
      res.status(201).json({ id: docRef.id, ...venueData });
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  });

  // Admin/Owner endpoint: Update venue
  app.put("/api/venues/:id", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      const { id } = req.params;
      const db = admin.firestore();
      const venueRef = db.collection("venues").doc(id);
      const venueDoc = await venueRef.get();
      
      if (!venueDoc.exists) {
        return res.status(404).json({ error: "Venue not found" });
      }
      
      const venueData = venueDoc.data();
      
      // Check if user is admin or owner
      const configDoc = await db.collection("config").doc("app").get();
      const config = configDoc.data();
      const admins = config?.admins || [];
      const isAdmin = req.user && admins.includes(req.user.uid);
      const isOwner = req.user && venueData?.ownerId === req.user.uid;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await venueRef.update({
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Invalidate cache
      sitemapVenueCache.venues = [];
      sitemapVenueCache.timestamp = 0;
      
      res.json({ id, ...req.body });
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ error: "Failed to update venue" });
    }
  });

  // Admin endpoint: Delete venue
  app.delete("/api/venues/:id", ...requireAuthenticatedFullAdmin, async (req: ExpressRequest, res: Response) => {
    try {
      const { id } = req.params;
      const db = admin.firestore();
      await db.collection("venues").doc(id).delete();
      
      // Invalidate cache
      sitemapVenueCache.venues = [];
      sitemapVenueCache.timestamp = 0;
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ error: "Failed to delete venue" });
    }
  });

  // Public endpoint: Get reviews for a venue (server-side cached)
  app.get("/api/venues/:venueId/reviews", async (req, res) => {
    try {
      const { venueId } = req.params;
      
      // Load reviews cache if needed
      await loadAllReviews();
      
      const reviews = getReviewsForVenue(venueId);
      
      // Set cache headers for browser caching (1 hour)
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json({ reviews, lastDoc: null });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Public endpoint: Get recent reviews across all venues (server-side cached)
  app.get("/api/reviews/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      
      // Load reviews cache if needed
      await loadAllReviews();
      
      const reviews = getRecentReviewsFromCache(limit);
      
      // Set cache headers for browser caching (1 hour)
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching recent reviews:", error);
      res.status(500).json({ error: "Failed to fetch recent reviews" });
    }
  });

  // Public endpoint: Get all blog posts
  app.get("/api/blog", async (req, res) => {
    try {
      const posts = await getAllBlogPosts();
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Public endpoint: Get a single blog post by slug
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await getBlogPostBySlug(slug);
      
      if (!post) {
        res.status(404).json({ error: "Blog post not found" });
        return;
      }
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(post);
    } catch (error) {
      console.error(`Error fetching blog post ${req.params.slug}:`, error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Public endpoint: Get user's reviews
  app.get("/api/reviews/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const db = admin.firestore();
      
      const reviewsQuery = db.collectionGroup("reviews")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc");
      
      const snapshot = await reviewsQuery.get();
      const reviews = [];
      
      for (const doc of snapshot.docs) {
        const reviewData = doc.data();
        const venueId = doc.ref.parent.parent?.id;
        
        if (venueId) {
          const venueDoc = await db.collection("venues").doc(venueId).get();
          const venueData = venueDoc.data();
          
          reviews.push({
            id: doc.id,
            ...reviewData,
            venueId,
            venueName: venueData?.name || "Unknown Venue",
            venueCity: venueData?.city,
            venueState: venueData?.state,
          });
        }
      }
      
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Public endpoint: Get user's review for a specific venue
  app.get("/api/reviews/venue/:venueId/user/:userId", async (req, res) => {
    try {
      const { venueId, userId } = req.params;
      const db = admin.firestore();
      
      const reviewRef = db.collection("venues").doc(venueId).collection("reviews").doc(userId);
      const reviewDoc = await reviewRef.get();
      
      if (!reviewDoc.exists) {
        return res.status(404).json({ error: "Review not found" });
      }
      
      res.json({ id: reviewDoc.id, ...reviewDoc.data() });
    } catch (error) {
      console.error("Error fetching review:", error);
      res.status(500).json({ error: "Failed to fetch review" });
    }
  });

  // Authenticated endpoint: Create or update review
  app.post("/api/reviews", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { venueId, rating, text, userDisplayName, userPhotoURL } = req.body;
      
      if (!venueId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "venueId and rating (1-5) are required" });
      }
      
      const db = admin.firestore();
      const venueRef = db.collection("venues").doc(venueId);
      const reviewRef = venueRef.collection("reviews").doc(req.user.uid);
      
      await db.runTransaction(async (transaction) => {
        const venueDoc = await transaction.get(venueRef);
        if (!venueDoc.exists) {
          throw new Error("Venue not found");
        }
        
        const venueData = venueDoc.data();
        const existingReviewDoc = await transaction.get(reviewRef);
        const existingReview = existingReviewDoc.data();
        
        const reviewData: any = {
          rating,
          userId: req.user!.uid,
          userDisplayName: userDisplayName || req.user.email || "Anonymous",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        if (text) reviewData.text = text;
        if (userPhotoURL) reviewData.userPhotoURL = userPhotoURL;
        
        if (existingReviewDoc.exists) {
          // Update existing review
          const oldRating = existingReview?.rating || 0;
          transaction.update(reviewRef, reviewData);
          
          const ratingDiff = rating - oldRating;
          const newAvgRating =
            ((venueData?.avgRating || 0) * (venueData?.reviewCount || 0) + ratingDiff) /
            (venueData?.reviewCount || 1);
          
          transaction.update(venueRef, {
            avgRating: newAvgRating,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Create new review
          reviewData.createdAt = admin.firestore.FieldValue.serverTimestamp();
          transaction.set(reviewRef, reviewData);
          
          const newReviewCount = (venueData?.reviewCount || 0) + 1;
          const newAvgRating =
            ((venueData?.avgRating || 0) * (venueData?.reviewCount || 0) + rating) / newReviewCount;
          
          transaction.update(venueRef, {
            avgRating: newAvgRating,
            reviewCount: newReviewCount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });
      
      // Invalidate reviews cache
      reviewsCache.byVenue.clear();
      reviewsCache.timestamp = 0;
      sitemapVenueCache.venues = [];
      sitemapVenueCache.timestamp = 0;
      
      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error("Error creating/updating review:", error);
      res.status(500).json({ error: error.message || "Failed to create review" });
    }
  });

  // Authenticated endpoint: Delete review
  app.delete("/api/reviews/:venueId", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { venueId } = req.params;
      const db = admin.firestore();
      const venueRef = db.collection("venues").doc(venueId);
      const reviewRef = venueRef.collection("reviews").doc(req.user.uid);
      
      await db.runTransaction(async (transaction) => {
        const venueDoc = await transaction.get(venueRef);
        const reviewDoc = await transaction.get(reviewRef);
        
        if (!venueDoc.exists || !reviewDoc.exists) {
          throw new Error("Venue or review not found");
        }
        
        const reviewData = reviewDoc.data();
        const venueData = venueDoc.data();
        
        transaction.delete(reviewRef);
        
        const newReviewCount = Math.max(0, (venueData?.reviewCount || 0) - 1);
        let newAvgRating = 0;
        
        if (newReviewCount > 0) {
          newAvgRating =
            ((venueData?.avgRating || 0) * (venueData?.reviewCount || 0) - (reviewData?.rating || 0)) /
            newReviewCount;
        }
        
        transaction.update(venueRef, {
          avgRating: newAvgRating,
          reviewCount: newReviewCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      
      // Invalidate caches
      reviewsCache.byVenue.delete(venueId);
      sitemapVenueCache.venues = [];
      sitemapVenueCache.timestamp = 0;
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: error.message || "Failed to delete review" });
    }
  });

  // Public endpoint: contact form submission
  app.post("/api/contact", async (req, res) => {
    const { email, subject, message, type, venueId, venueName } = req.body;

    // Validate required fields
    if (!email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate field lengths
    if (subject.length < 3 || subject.length > 100) {
      return res
        .status(400)
        .json({ error: "Subject must be between 3 and 100 characters" });
    }

    if (message.length < 10 || message.length > 1000) {
      return res
        .status(400)
        .json({ error: "Message must be between 10 and 1000 characters" });
    }

    try {
      const db = admin.firestore();
      const contactData = {
        email,
        subject,
        message,
        ...(type && { type }),
        ...(venueId && { venueId }),
        ...(venueName && { venueName }),
        status: "new",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("contacts").add(contactData);

      res.status(201).json({
        success: true,
        contactId: docRef.id,
        message: "Contact message submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // Admin endpoint: send custom email
  app.post(
    "/api/admin/send-email",
    ...requireAuthenticatedAdmin,
    async (req: ExpressRequest, res: Response) => {
      const { to, subject, html } = req.body;

      // Validate required fields
      if (!to || !subject || !html) {
        return res.status(400).json({ error: "to, subject, and html are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      try {
        const { sendCustomEmail } = await import("./resend");
        await sendCustomEmail(to, subject, html);

        res.status(200).json({
          success: true,
          message: "Email sent successfully",
        });
      } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
      }
    }
  );

  // Admin endpoints for contacts management
  app.get(
    "/api/admin/contacts",
    ...requireAuthenticatedAdmin,
    async (_req: ExpressRequest, res: Response) => {
      try {
        const db = admin.firestore();
        const snapshot = await db
          .collection("contacts")
          .orderBy("createdAt", "desc")
          .get();

        const contacts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email,
            subject: data.subject,
            message: data.message,
            type: data.type,
            venueId: data.venueId,
            venueName: data.venueName,
            status: data.status,
            createdAt:
              data.createdAt?.toDate().toISOString() ||
              new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
          };
        });

        res.status(200).json(contacts);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ error: "Failed to fetch contacts" });
      }
    },
  );

  app.patch(
    "/api/admin/contacts/:id",
    ...requireAuthenticatedAdmin,
    async (req: ExpressRequest, res: Response) => {
      const { id } = req.params;
      const { status } = req.body;

      if (
        !status ||
        !["new", "in_progress", "resolved", "archived"].includes(status)
      ) {
        return res.status(400).json({ error: "Invalid status" });
      }

      try {
        const db = admin.firestore();
        await db.collection("contacts").doc(id).update({
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res
          .status(200)
          .json({ success: true, message: "Contact updated successfully" });
      } catch (error) {
        console.error("Error updating contact:", error);
        res.status(500).json({ error: "Failed to update contact" });
      }
    },
  );

  app.delete(
    "/api/admin/contacts/:id",
    ...requireAuthenticatedAdmin,
    async (_req: ExpressRequest, res: Response) => {
      const { id } = _req.params;

      try {
        const db = admin.firestore();
        await db.collection("contacts").doc(id).delete();

        res
          .status(200)
          .json({ success: true, message: "Contact deleted successfully" });
      } catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({ error: "Failed to delete contact" });
      }
    },
  );

  // Email verification routes
  const { generateVerificationCode } = await import("./resend");
  const { getEmailService } = await import("./emailService");

  app.post("/api/auth/send-code", async (req, res) => {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    try {
      const db = admin.firestore();
      const normalizedEmail = email.toLowerCase();
      
      // Check for recent codes (rate limiting: 1 code per minute per email)
      // Fetch all codes for email and check in-memory to avoid composite index
      const allCodes = await db
        .collection("verificationCodes")
        .where("email", "==", normalizedEmail)
        .get();

      if (!allCodes.empty) {
        // Sort by createdAt in memory and check most recent
        const codes = allCodes.docs.map(doc => doc.data());
        const sortedCodes = codes.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
        
        const mostRecent = sortedCodes[0];
        const createdAt = mostRecent.createdAt?.toDate();
        if (createdAt && (Date.now() - createdAt.getTime()) < 60 * 1000) {
          return res.status(429).json({ 
            error: "Please wait at least 60 seconds before requesting another code" 
          });
        }
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code in Firestore
      await db.collection("verificationCodes").add({
        email: normalizedEmail,
        code,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        verified: false,
        attempts: 0,
      });

      // Send email with verification code using email service abstraction
      const emailService = getEmailService();
      await emailService.sendVerificationCode(email, code);

      res.status(200).json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Error sending verification code:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    try {
      const db = admin.firestore();
      const normalizedEmail = email.toLowerCase();
      
      // Find verification codes for this email (avoid composite index by sorting in memory)
      const snapshot = await db
        .collection("verificationCodes")
        .where("email", "==", normalizedEmail)
        .where("code", "==", code)
        .where("verified", "==", false)
        .get();

      if (snapshot.empty) {
        // Check if too many failed attempts on most recent code
        const allCodes = await db
          .collection("verificationCodes")
          .where("email", "==", normalizedEmail)
          .where("verified", "==", false)
          .get();

        if (!allCodes.empty) {
          // Sort in memory and get most recent
          const docs = allCodes.docs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.data().createdAt?.toDate?.()?.getTime() || 0;
            return bTime - aTime;
          });
          
          const attemptDoc = docs[0];
          const attempts = (attemptDoc.data().attempts || 0) + 1;
          
          await attemptDoc.ref.update({ attempts });
          
          if (attempts >= 5) {
            // Lock out after 5 failed attempts
            await attemptDoc.ref.update({ verified: true }); // Mark as used
            return res.status(429).json({ 
              error: "Too many failed attempts. Please request a new code." 
            });
          }
        }
        
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // If multiple matches, get the most recent one
      const docs = snapshot.docs.sort((a, b) => {
        const aTime = a.data().createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.data().createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      const verificationDoc = docs[0];
      const verificationData = verificationDoc.data();

      // Check if code has expired
      const expiresAt = verificationData.expiresAt.toDate();
      if (new Date() > expiresAt) {
        return res.status(400).json({ error: "Verification code has expired" });
      }

      // Check attempts
      if ((verificationData.attempts || 0) >= 5) {
        return res.status(429).json({ 
          error: "Too many failed attempts. Please request a new code." 
        });
      }

      // Mark code as verified
      await verificationDoc.ref.update({
        verified: true,
      });

      // Check if user already exists
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create new user
          userRecord = await admin.auth().createUser({
            email: normalizedEmail,
            emailVerified: true,
          });

          // Create user profile in Firestore
          await db.collection("users").doc(userRecord.uid).set({
            email: normalizedEmail,
            displayName: normalizedEmail.split("@")[0],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          throw error;
        }
      }

      // Create custom token for sign-in
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      res.status(200).json({ 
        success: true, 
        customToken,
        isNewUser: !verificationData.verified
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ error: "Failed to verify code" });
    }
  });

  // Public endpoint: Get user profile by ID
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Public endpoint: Get user by slug
  app.get("/api/users/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const db = admin.firestore();
      const usersRef = db.collection("users");
      const query = usersRef.where("slug", "==", slug).limit(1);
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userDoc = snapshot.docs[0];
      res.json({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      console.error("Error fetching user by slug:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Authenticated endpoint: Update user profile
  app.put("/api/users/:userId", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user || req.user.uid !== req.params.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { userId } = req.params;
      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);
      
      const updateData: any = {
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await userRef.update(updateData);
      
      // If displayName or photoURL changed, update reviews
      if (updateData.displayName !== undefined || updateData.photoURL !== undefined) {
        const reviewsQuery = db.collectionGroup("reviews")
          .where("userId", "==", userId);
        const reviewsSnapshot = await reviewsQuery.get();
        
        const reviewUpdates: any = {};
        if (updateData.displayName !== undefined) {
          reviewUpdates.userDisplayName = updateData.displayName;
        }
        if (updateData.photoURL !== undefined) {
          reviewUpdates.userPhotoURL = updateData.photoURL;
        }
        
        const batch = db.batch();
        reviewsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, reviewUpdates);
        });
        await batch.commit();
      }
      
      res.json({ id: userId, ...updateData });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get venues owned by user (no browser cache so edits show after refresh)
  app.get("/api/users/:userId/venues", async (req, res) => {
    try {
      const { userId } = req.params;
      const venues = await getVenuesForSitemap();
      const ownedVenues = venues.filter(v => v.ownerId === userId && v.isActive !== false);
      
      // Short cache so edits show after ~1 min without hammering the server
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.json(ownedVenues);
    } catch (error) {
      console.error("Error fetching user venues:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  // Authenticated endpoint: Get saved alleys
  app.get("/api/users/:userId/saved-alleys", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user || req.user.uid !== req.params.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { userId } = req.params;
      const db = admin.firestore();
      const savedAlleysRef = db.collection("users").doc(userId).collection("savedAlleys");
      const snapshot = await savedAlleysRef.get();
      
      if (snapshot.empty) {
        return res.json([]);
      }
      
      const venueIds = snapshot.docs.map(doc => doc.data().venueId).filter(Boolean);
      const venues = await getVenuesForSitemap();
      const savedVenues = venues.filter(v => venueIds.includes(v.id));
      
      res.json(savedVenues);
    } catch (error) {
      console.error("Error fetching saved alleys:", error);
      res.status(500).json({ error: "Failed to fetch saved alleys" });
    }
  });

  // Authenticated endpoint: Save alley
  app.post("/api/users/:userId/saved-alleys/:venueId", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user || req.user.uid !== req.params.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { userId, venueId } = req.params;
      const db = admin.firestore();
      const savedAlleyRef = db.collection("users").doc(userId).collection("savedAlleys").doc(venueId);
      
      await savedAlleyRef.set({
        venueId,
        savedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error saving alley:", error);
      res.status(500).json({ error: "Failed to save alley" });
    }
  });

  // Authenticated endpoint: Unsave alley
  app.delete("/api/users/:userId/saved-alleys/:venueId", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user || req.user.uid !== req.params.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { userId, venueId } = req.params;
      const db = admin.firestore();
      const savedAlleyRef = db.collection("users").doc(userId).collection("savedAlleys").doc(venueId);
      await savedAlleyRef.delete();
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unsaving alley:", error);
      res.status(500).json({ error: "Failed to unsave alley" });
    }
  });

  // Public endpoint: Create suggestion
  app.post("/api/suggestions", async (req, res) => {
    try {
      const db = admin.firestore();
      const suggestionsRef = db.collection("suggestions");
      
      const suggestionData: any = {
        ...req.body,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      const docRef = await suggestionsRef.add(suggestionData);
      res.status(201).json({ id: docRef.id, ...suggestionData });
    } catch (error) {
      console.error("Error creating suggestion:", error);
      res.status(500).json({ error: "Failed to create suggestion" });
    }
  });

  // Authenticated endpoint: Get user's suggestions
  app.get("/api/suggestions/user/:userId", authenticateToken, async (req: ExpressRequest, res: Response) => {
    try {
      if (!req.user || req.user.uid !== req.params.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { userId } = req.params;
      const db = admin.firestore();
      const suggestionsRef = db.collection("suggestions");
      const query = suggestionsRef.where("userId", "==", userId);
      const snapshot = await query.get();
      
      const suggestions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Sort by createdAt descending
      suggestions.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // Public endpoint: Get suggestion for venue
  app.get("/api/suggestions/venue/:venueId", async (req, res) => {
    try {
      const { venueId } = req.params;
      const db = admin.firestore();
      const suggestionsRef = db.collection("suggestions");
      
      // Check assignedVenueId first
      let query = suggestionsRef.where("assignedVenueId", "==", venueId).limit(1);
      let snapshot = await query.get();
      
      if (snapshot.empty) {
        // Fall back to venueId field
        query = suggestionsRef.where("venueId", "==", venueId).limit(1);
        snapshot = await query.get();
      }
      
      if (snapshot.empty) {
        return res.status(404).json({ error: "Suggestion not found" });
      }
      
      const doc = snapshot.docs[0];
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error("Error fetching suggestion:", error);
      res.status(500).json({ error: "Failed to fetch suggestion" });
    }
  });

  // Public endpoint: Get USA pricing (uses server cache, refreshes at midnight)
  app.get("/api/pricing/usa", async (req, res) => {
    try {
      const cache = await getPricingReportCache();
      if (!cache || !cache.latestDate || !cache.usa) {
        return res.status(404).json({ error: "Pricing data not available" });
      }
      const data = cache.usa;
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json({
        averageHourlyPrice: data?.averageHourlyPrice,
        averageGamePrice: data?.averageGamePrice,
        averageShoeRentalPrice: data?.averageShoeRentalPrice,
        venueCount: data?.venueCount,
        venuesWithGamePricing: data?.venuesWithGamePricing || 0,
        venuesWithHourlyPricing: data?.venuesWithHourlyPricing || 0,
        venuesWithShoeRentalPricing: data?.venuesWithShoeRentalPricing || 0,
        lastUpdated: data?.lastUpdated,
      });
    } catch (error) {
      console.error("Error fetching USA pricing:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

  // Public endpoint: Get state pricing (uses server cache)
  app.get("/api/pricing/state/:state", async (req, res) => {
    try {
      const { state } = req.params;
      const cache = await getPricingReportCache();
      if (!cache || !cache.latestDate) {
        return res.status(404).json({ error: "Pricing data not available" });
      }
      const data = cache.states.get(state.toUpperCase());
      if (!data) {
        return res.status(404).json({ error: "Pricing data not found" });
      }
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json({
        averageHourlyPrice: data?.averageHourlyPrice,
        averageGamePrice: data?.averageGamePrice,
        averageShoeRentalPrice: data?.averageShoeRentalPrice,
        venueCount: data?.venueCount,
        venuesWithGamePricing: data?.venuesWithGamePricing || 0,
        venuesWithHourlyPricing: data?.venuesWithHourlyPricing || 0,
        venuesWithShoeRentalPricing: data?.venuesWithShoeRentalPricing || 0,
        lastUpdated: data?.lastUpdated,
        state: data?.state || state.toUpperCase(),
      });
    } catch (error) {
      console.error("Error fetching state pricing:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

  // Public endpoint: Get city pricing (uses server cache)
  app.get("/api/pricing/city/:city/:state", async (req, res) => {
    try {
      const { city, state } = req.params;
      const cache = await getPricingReportCache();
      if (!cache || !cache.latestDate) {
        return res.status(404).json({ error: "Pricing data not available" });
      }
      const cityKey = city
        .split(/[\s-]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("-");
      const docId = `${cityKey}-${state.toUpperCase()}`;
      const data = cache.cities.get(docId);
      if (!data) {
        return res.status(404).json({ error: "Pricing data not found" });
      }
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json({
        averageHourlyPrice: data?.averageHourlyPrice,
        averageGamePrice: data?.averageGamePrice,
        averageShoeRentalPrice: data?.averageShoeRentalPrice,
        venueCount: data?.venueCount,
        venuesWithGamePricing: data?.venuesWithGamePricing || 0,
        venuesWithHourlyPricing: data?.venuesWithHourlyPricing || 0,
        venuesWithShoeRentalPricing: data?.venuesWithShoeRentalPricing || 0,
        lastUpdated: data?.lastUpdated,
        city: data?.city || city,
        state: data?.state || state.toUpperCase(),
      });
    } catch (error) {
      console.error("Error fetching city pricing:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

  // Public endpoint: Get all states with pricing (uses server cache)
  app.get("/api/pricing/states", async (req, res) => {
    try {
      const cache = await getPricingReportCache();
      if (!cache || !cache.latestDate) {
        return res.json([]);
      }
      const states = Array.from(cache.states.keys()).sort();
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json(states);
    } catch (error) {
      console.error("Error fetching pricing states:", error);
      res.status(500).json({ error: "Failed to fetch states" });
    }
  });

  // Public endpoint: Get cities with pricing for state (uses server cache)
  app.get("/api/pricing/cities/:state", async (req, res) => {
    try {
      const { state } = req.params;
      const cache = await getPricingReportCache();
      if (!cache || !cache.latestDate) {
        return res.json([]);
      }
      const cities = new Set<string>();
      const stateUpper = state.toUpperCase();
      cache.cities.forEach((_, docId) => {
        if (docId.endsWith(`-${stateUpper}`)) {
          const cityPart = docId.replace(`-${stateUpper}`, "");
          const cityName = cityPart.replace(/-/g, " ");
          cities.add(cityName);
        }
      });
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json(Array.from(cities).sort());
    } catch (error) {
      console.error("Error fetching pricing cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  // Public endpoint: Get pricing extremes (uses server cache)
  app.get("/api/pricing/extremes", async (req, res) => {
    try {
      const cache = await getPricingReportCache();
      if (!cache || !cache.latestDate || !cache.extremes) {
        return res.json({
          cheapestByGame: null,
          mostExpensiveByGame: null,
          cheapestByHour: null,
          mostExpensiveByHour: null,
          reportDate: null,
        });
      }
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json({
        ...cache.extremes,
        reportDate: cache.latestDate,
      });
    } catch (error) {
      console.error("Error fetching pricing extremes:", error);
      res.status(500).json({ error: "Failed to fetch pricing extremes" });
    }
  });

  // Public endpoint: Get all amenities
  app.get("/api/amenities", async (req, res) => {
    try {
      const db = admin.firestore();
      const amenitiesRef = db.collection("amenities");
      const query = amenitiesRef.orderBy("name", "asc");
      const snapshot = await query.get();
      
      const amenities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching amenities:", error);
      res.status(500).json({ error: "Failed to fetch amenities" });
    }
  });

  // Admin endpoint: Create amenity
  app.post("/api/amenities", ...requireAuthenticatedAdmin, async (req: ExpressRequest, res: Response) => {
    try {
      const db = admin.firestore();
      const amenitiesRef = db.collection("amenities");
      
      // Check for duplicate name
      const existingSnapshot = await amenitiesRef.get();
      const existingNames = existingSnapshot.docs.map(doc => 
        (doc.data().name || "").toLowerCase().trim()
      );
      
      const newName = (req.body.name || "").toLowerCase().trim();
      if (existingNames.includes(newName)) {
        return res.status(400).json({ error: "An amenity with this name already exists" });
      }
      
      const docRef = await amenitiesRef.add({
        name: (req.body.name || "").trim(),
        description: req.body.description?.trim() || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      res.status(201).json({ id: docRef.id, name: req.body.name, description: req.body.description });
    } catch (error) {
      console.error("Error creating amenity:", error);
      res.status(500).json({ error: "Failed to create amenity" });
    }
  });

  // Admin endpoint: Update amenity
  app.put("/api/amenities/:id", ...requireAuthenticatedAdmin, async (req: ExpressRequest, res: Response) => {
    try {
      const { id } = req.params;
      const db = admin.firestore();
      const amenityRef = db.collection("amenities").doc(id);
      
      // Check for duplicate name if name is being changed
      if (req.body.name) {
        const amenitiesRef = db.collection("amenities");
        const existingSnapshot = await amenitiesRef.get();
        const existingNames = existingSnapshot.docs
          .filter(doc => doc.id !== id)
          .map(doc => (doc.data().name || "").toLowerCase().trim());
        
        const newName = req.body.name.toLowerCase().trim();
        if (existingNames.includes(newName)) {
          return res.status(400).json({ error: "An amenity with this name already exists" });
        }
      }
      
      const updateData: any = {};
      if (req.body.name) updateData.name = req.body.name.trim();
      if (req.body.description !== undefined) updateData.description = req.body.description?.trim() || null;
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      await amenityRef.update(updateData);
      res.json({ id, ...updateData });
    } catch (error) {
      console.error("Error updating amenity:", error);
      res.status(500).json({ error: "Failed to update amenity" });
    }
  });

  // Admin endpoint: Delete amenity
  app.delete("/api/amenities/:id", ...requireAuthenticatedAdmin, async (req: ExpressRequest, res: Response) => {
    try {
      const { id } = req.params;
      const db = admin.firestore();
      await db.collection("amenities").doc(id).delete();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting amenity:", error);
      res.status(500).json({ error: "Failed to delete amenity" });
    }
  });

  // Public endpoint: Get hub by slug
  app.get("/api/hubs/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const db = admin.firestore();
      const hubsRef = db.collection("hubs");
      const query = hubsRef.where("slug", "==", slug).limit(1);
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return res.status(404).json({ error: "Hub not found" });
      }
      
      const hubDoc = snapshot.docs[0];
      res.json({ id: hubDoc.id, ...hubDoc.data() });
    } catch (error) {
      console.error("Error fetching hub:", error);
      res.status(500).json({ error: "Failed to fetch hub" });
    }
  });

  // Server-side meta tag injection for bots/crawlers on hub pages
  app.get("/best-bowling*", async (req, res, next) => {
    try {
      const userAgent = req.get("user-agent") || "";
      
      console.log(`[Hub Meta] Request to ${req.path} from: ${userAgent.substring(0, 100)}`);
      
      // List of known bot/crawler user agents (search engines + social media)
      const botUserAgents = [
        // Search engines
        "googlebot",
        "bingbot",
        "yandexbot",
        "duckduckbot",
        "baiduspider",
        "applebot",
        "ia_archiver",
        // Social media
        "facebookexternalhit",
        "Facebot",
        "Twitterbot", 
        "linkedinbot",
        "slackbot",
        "whatsapp",
        "discordbot",
        "telegrambot",
        "pinterestbot",
        "redditbot"
      ];
      
      // Check if request is from a bot/crawler
      const isBot = botUserAgents.some(bot => 
        userAgent.toLowerCase().includes(bot.toLowerCase())
      );
      
      console.log(`[Hub Meta] Is bot: ${isBot}`);
      
      // Only inject meta tags for bots - let regular browsers get the React app
      if (!isBot) {
        return next();
      }
      
      // Extract slug from path (remove leading slash)
      const slug = req.path.substring(1);
      
      const db = admin.firestore();
      const hubsRef = db.collection("hubs");
      const hubQuery = await hubsRef.where("slug", "==", slug).limit(1).get();

      if (hubQuery.empty) {
        console.log(`[Hub Meta] Hub not found for slug: ${slug}`);
        return next();
      }

      const hubDoc = hubQuery.docs[0];
      const hub = hubDoc.data();
      if (!hub) {
        return next();
      }

      console.log(`[Hub Meta] Found hub: ${hub.title}`);

      // Generate meta tags
      const pageTitle = hub.title || "Best Bowling Alleys | BowlingAlleys.io";
      const pageDescription = hub.description || hub.subtitle || "Discover the best bowling alleys in your area with reviews, pricing, and more.";
      
      // Use hub's OG image or fallback to default
      // Twitter can't access Google encrypted thumbnails, so we need to filter those out
      let ogImage = "https://bowlingalleys.io/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg";
      if (hub.heroOgImageUrl && !hub.heroOgImageUrl.includes("encrypted-tbn") && !hub.heroOgImageUrl.includes("googleusercontent.com")) {
        ogImage = hub.heroOgImageUrl;
      }
      
      console.log(`[Hub Meta] Using OG image: ${ogImage}`);
      
      // Use canonical path from hub data
      const canonicalUrl = `https://bowlingalleys.io${hub.canonicalPath || `/${slug}`}`;

      // Read the HTML template
      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );
      let html = await fs.promises.readFile(templatePath, "utf-8");

      // Inject meta tags
      const metaTags = `
    <title>${pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
    <meta name="description" content="${pageDescription.replace(/"/g, "&quot;")}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${pageTitle.replace(/"/g, "&quot;")}" />
    <meta property="og:description" content="${pageDescription.replace(/"/g, "&quot;")}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="BowlingAlleys.io" />
    <meta property="og:image" content="${ogImage.replace(/"/g, "&quot;")}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${pageTitle.replace(/"/g, "&quot;")}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@BowlingAlleysIO" />
    <meta name="twitter:title" content="${pageTitle.replace(/"/g, "&quot;")}" />
    <meta name="twitter:description" content="${pageDescription.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image" content="${ogImage.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image:alt" content="${pageTitle.replace(/"/g, "&quot;")}" />
`;

      // Replace the placeholder comment with our meta tags
      html = html.replace(
        "<!-- Open Graph and Twitter meta tags are dynamically managed by react-helmet-async in each page component -->",
        metaTags
      );

      // Also replace the default title if it exists
      html = html.replace(
        /<title>.*?<\/title>/,
        `<title>${pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>`
      );

      console.log(`[Hub Meta] Injected meta tags for: ${pageTitle}`);
      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (error) {
      console.error("Error in hub meta tag injection:", error);
      // If anything goes wrong, fall through to Vite
      next();
    }
  });

  // Server-side meta tag injection for bots/crawlers on venue pages
  app.get("/venue/:id", async (req, res, next) => {
    try {
      const userAgent = req.get("user-agent") || "";
      
      // Log all requests to venue pages for debugging
      console.log(`[Venue Meta] Request from: ${userAgent.substring(0, 100)}`);
      
      // List of known bot/crawler user agents (search engines + social media)
      // Note: Instagram in-app browser is NOT included here because it's a real browser
      // used by actual users. Instagram's crawler uses facebookexternalhit/Facebot instead.
      const botUserAgents = [
        // Search engines
        "googlebot",
        "bingbot",
        "yandexbot",
        "duckduckbot",
        "baiduspider",
        "applebot",
        "ia_archiver",
        // Social media
        "facebookexternalhit",
        "Facebot",
        "Twitterbot", 
        "linkedinbot",
        "slackbot",
        "whatsapp",
        "discordbot",
        "telegrambot",
        "pinterestbot",
        "redditbot"
      ];
      
      // Check if request is from a bot/crawler
      const isBot = botUserAgents.some(bot => 
        userAgent.toLowerCase().includes(bot.toLowerCase())
      );
      
      console.log(`[Venue Meta] Is bot: ${isBot}`);
      
      // Only inject meta tags for bots - let regular browsers get the React app
      if (!isBot) {
        return next();
      }
      
      const { id } = req.params;
      const db = admin.firestore();
      const venueDoc = await db.collection("venues").doc(id).get();

      if (!venueDoc.exists) {
        return next();
      }

      const venue = venueDoc.data();
      if (!venue) {
        return next();
      }

      // Generate meta tags
      const loc = [venue.city, venue.state].filter(Boolean).join(", ");
      const year = new Date().getFullYear();
      
      let pageTitle = "Bowling Alley Details | BowlingAlleys.io";
      if (venue.seoTitle) {
        pageTitle = venue.seoTitle;
      } else {
        const baseTitle = loc
          ? `${venue.name} – ${loc} Reviews & Prices (${year})`
          : `${venue.name} Reviews & Prices (${year}) | BowlingAlleys.io`;
        pageTitle =
          baseTitle.length > 60
            ? `${venue.name} – ${loc} Bowling (${year})`
            : baseTitle;
      }

      const ratingBits = venue.avgRating > 0 ? `${venue.avgRating.toFixed(1)}★ · ` : "";
      const reviewBits = venue.reviewCount > 0
        ? ` • ${venue.reviewCount} review${venue.reviewCount === 1 ? "" : "s"}`
        : "";
      let pageDescription = `${ratingBits}${venue.name}${loc ? ` in ${loc}` : ""}: prices, hours, shoe rental, leagues, cosmic & directions. Plan with BowlingAlleys.io${reviewBits}.`;
      if (pageDescription.length > 155) {
        pageDescription = pageDescription.slice(0, 152).replace(/\s+\S*$/, "") + "…";
      }

      // Get image URL (use coverImageUrl to match homepage VenueCard logic)
      let ogImage = "https://bowlingalleys.io/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg";
      if (venue.coverImageUrl) {
        ogImage = venue.coverImageUrl;
      }

      // Read the HTML template
      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );
      let html = await fs.promises.readFile(templatePath, "utf-8");

      // Inject meta tags
      const metaTags = `
    <title>${pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
    <meta name="description" content="${pageDescription.replace(/"/g, "&quot;")}" />
    <link rel="canonical" href="https://bowlingalleys.io/venue/${id}" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="place" />
    <meta property="og:title" content="${pageTitle.replace(/"/g, "&quot;")}" />
    <meta property="og:description" content="${pageDescription.replace(/"/g, "&quot;")}" />
    <meta property="og:url" content="https://bowlingalleys.io/venue/${id}" />
    <meta property="og:site_name" content="BowlingAlleys.io" />
    <meta property="og:image" content="${ogImage.replace(/"/g, "&quot;")}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${venue.name} bowling alley" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@BowlingAlleysIO" />
    <meta name="twitter:title" content="${pageTitle.replace(/"/g, "&quot;")}" />
    <meta name="twitter:description" content="${pageDescription.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image" content="${ogImage.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image:alt" content="${venue.name} bowling alley" />
`;

      // Replace the placeholder comment with our meta tags
      html = html.replace(
        "<!-- Open Graph and Twitter meta tags are dynamically managed by react-helmet-async in each page component -->",
        metaTags
      );

      // Also replace the default title if it exists
      html = html.replace(
        /<title>.*?<\/title>/,
        `<title>${pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>`
      );

      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (error) {
      console.error("Error in bot meta tag injection:", error);
      // If anything goes wrong, fall through to Vite
      next();
    }
  });

  // Helper function to check if request is from a bot
  const isBotRequest = (userAgent: string): boolean => {
    const botUserAgents = [
      "googlebot", "bingbot", "yandexbot", "duckduckbot", "baiduspider", "applebot", "ia_archiver",
      "facebookexternalhit", "Facebot", "Twitterbot", "linkedinbot", "slackbot", "whatsapp",
      "discordbot", "telegrambot", "pinterestbot", "redditbot"
    ];
    return botUserAgents.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
  };

  // Helper function to inject meta tags into HTML
  const injectMetaTags = async (
    title: string,
    description: string,
    canonicalUrl: string,
    ogImage: string,
    ogType: string = "website"
  ): Promise<string> => {
    const fs = await import("fs");
    const path = await import("path");
    const templatePath = path.resolve(process.cwd(), "client", "index.html");
    let html = await fs.promises.readFile(templatePath, "utf-8");

    const metaTags = `
    <title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
    <meta name="description" content="${description.replace(/"/g, "&quot;")}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
    <meta property="og:description" content="${description.replace(/"/g, "&quot;")}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="BowlingAlleys.io" />
    <meta property="og:image" content="${ogImage.replace(/"/g, "&quot;")}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="800" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@BowlingAlleysIO" />
    <meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
    <meta name="twitter:description" content="${description.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image" content="${ogImage.replace(/"/g, "&quot;")}" />
`;

    html = html.replace(
      "<!-- Open Graph and Twitter meta tags are dynamically managed by react-helmet-async in each page component -->",
      metaTags
    );
    html = html.replace(/<title>.*?<\/title>/, `<title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>`);
    return html;
  };

  // Server-side meta tag injection for homepage
  app.get("/", async (req, res, next) => {
    try {
      const userAgent = req.get("user-agent") || "";
      if (!isBotRequest(userAgent)) return next();

      console.log(`[Home Meta] Bot request from: ${userAgent.substring(0, 50)}`);

      const html = await injectMetaTags(
        "Find Bowling Alleys Near You: Reviews, Prices & Hours | BowlingAlleys.io",
        "Discover 1,000+ bowling alleys across America. Compare prices, read reviews, find cosmic bowling, leagues, and birthday party venues near you.",
        "https://bowlingalleys.io/",
        "https://bowlingalleys.io/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg"
      );

      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (error) {
      console.error("Error in home meta tag injection:", error);
      next();
    }
  });

  // Server-side meta tag injection for locations pages
  app.get("/locations/:state?/:city?", async (req, res, next) => {
    try {
      const userAgent = req.get("user-agent") || "";
      if (!isBotRequest(userAgent)) return next();

      const { state, city } = req.params;
      console.log(`[Locations Meta] Bot request for state=${state}, city=${city}`);

      let title: string;
      let description: string;
      let canonicalUrl: string;

      if (state && city) {
        const cityDecoded = decodeURIComponent(city).replace(/-/g, " ");
        const stateDecoded = decodeURIComponent(state);
        title = `Bowling Alleys in ${cityDecoded}, ${stateDecoded} - Reviews & Prices | BowlingAlleys.io`;
        description = `Find the best bowling alleys in ${cityDecoded}, ${stateDecoded}. Compare prices, hours, read reviews, and discover cosmic bowling, leagues, and birthday party venues.`;
        canonicalUrl = `https://bowlingalleys.io/locations/${state}/${city}`;
      } else if (state) {
        const stateDecoded = decodeURIComponent(state);
        title = `Bowling Alleys in ${stateDecoded} - Find Local Lanes | BowlingAlleys.io`;
        description = `Discover bowling alleys across ${stateDecoded}. Browse by city, compare prices and reviews, find cosmic bowling, leagues, and family-friendly venues.`;
        canonicalUrl = `https://bowlingalleys.io/locations/${state}`;
      } else {
        title = "Find Bowling Alleys by Location - All 50 States | BowlingAlleys.io";
        description = "Browse 1,000+ bowling alleys across all 50 states. Find bowling alleys near you with prices, hours, reviews, and amenities.";
        canonicalUrl = "https://bowlingalleys.io/locations";
      }

      const html = await injectMetaTags(
        title,
        description,
        canonicalUrl,
        "https://bowlingalleys.io/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg"
      );

      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (error) {
      console.error("Error in locations meta tag injection:", error);
      next();
    }
  });

  // Server-side meta tag injection for experience pages
  const experiencePages: { [key: string]: { title: string; description: string } } = {
    "cosmic-bowling": {
      title: "Cosmic Bowling Near You - Glow Bowling & Black Light Lanes | BowlingAlleys.io",
      description: "Find cosmic bowling near you! Discover glow-in-the-dark lanes, black lights, music, and late-night bowling experiences at venues across America."
    },
    "bowling-leagues": {
      title: "Bowling Leagues Near You - Join a League Today | BowlingAlleys.io",
      description: "Find bowling leagues near you for all skill levels. Join adult, youth, senior, or corporate leagues at bowling alleys across America."
    },
    "bowling-birthday-party": {
      title: "Bowling Birthday Parties - Book Kids & Adult Parties | BowlingAlleys.io",
      description: "Plan the perfect bowling birthday party! Find venues with party packages, food, decorations, and private lanes for kids and adults."
    },
    "kids-bowling": {
      title: "Kids Bowling - Family-Friendly Bowling Alleys | BowlingAlleys.io",
      description: "Find family-friendly bowling alleys with bumper bowling, lightweight balls, arcade games, and kid-friendly food options."
    },
    "batting-cages": {
      title: "Bowling Alleys with Batting Cages | BowlingAlleys.io",
      description: "Find bowling alleys that also have batting cages. Perfect for sports lovers who want bowling and baseball practice in one location."
    },
    "arcade-bowling": {
      title: "Bowling Alleys with Arcades - Games & Lanes | BowlingAlleys.io",
      description: "Discover bowling alleys with full arcades, video games, redemption games, and entertainment centers for the whole family."
    },
    "bowling-bar": {
      title: "Bowling Bars - Bowling Alleys with Full Bars | BowlingAlleys.io",
      description: "Find bowling alleys with full-service bars, craft cocktails, beer selections, and adult-focused bowling experiences."
    },
    "bowling-restaurant": {
      title: "Bowling Alleys with Restaurants - Dine & Bowl | BowlingAlleys.io",
      description: "Discover bowling alleys with on-site restaurants serving quality food beyond typical snack bar fare."
    },
    "pro-shop": {
      title: "Bowling Pro Shops - Equipment & Gear | BowlingAlleys.io",
      description: "Find bowling alleys with pro shops for custom balls, shoes, bags, and professional fitting services."
    },
    "sports-bar": {
      title: "Bowling Alleys with Sports Bars | BowlingAlleys.io",
      description: "Watch the game while you bowl! Find bowling alleys with sports bars, big screens, and game day specials."
    },
    "bowling-lessons": {
      title: "Bowling Lessons Near You - Learn to Bowl | BowlingAlleys.io",
      description: "Find bowling lessons near you for all skill levels. Learn proper technique, improve your game, and get coaching from certified instructors."
    },
    "corporate-events": {
      title: "Corporate Events & Team Building at Bowling Alleys | BowlingAlleys.io",
      description: "Find bowling alleys perfect for corporate events and team building. Discover venues with private rooms, catering, and group packages."
    },
    "senior-bowling": {
      title: "Senior Bowling Discounts - 55+ Specials Near You | BowlingAlleys.io",
      description: "Find bowling alleys with senior discounts and 55+ specials. Discover venues with reduced daytime rates and senior-friendly programs."
    },
    "experiences": {
      title: "Bowling Experiences - Find Your Perfect Bowling Activity | BowlingAlleys.io",
      description: "Explore different bowling experiences: cosmic bowling, leagues, birthday parties, arcade games, bars, and more."
    }
  };

  app.get([
    "/cosmic-bowling/:state?/:city?",
    "/bowling-leagues/:state?/:city?",
    "/bowling-birthday-party/:state?/:city?",
    "/kids-bowling/:state?/:city?",
    "/batting-cages/:state?/:city?",
    "/arcade-bowling/:state?/:city?",
    "/bowling-bar/:state?/:city?",
    "/bowling-restaurant/:state?/:city?",
    "/pro-shop/:state?/:city?",
    "/bowling-lessons/:state?/:city?",
    "/corporate-events/:state?/:city?",
    "/senior-bowling/:state?/:city?",
    "/sports-bar",
    "/experiences"
  ], async (req, res, next) => {
    try {
      const userAgent = req.get("user-agent") || "";
      if (!isBotRequest(userAgent)) return next();

      // Extract the base path (experience type)
      const pathParts = req.path.split("/").filter(Boolean);
      const experienceType = pathParts[0];
      const state = req.params.state;
      const city = req.params.city;

      console.log(`[Experience Meta] Bot request for ${experienceType}, state=${state}, city=${city}`);

      const experience = experiencePages[experienceType];
      if (!experience) return next();

      let title = experience.title;
      let description = experience.description;
      let canonicalUrl = `https://bowlingalleys.io/${experienceType}`;

      // Customize for state/city if present
      if (state && city) {
        const cityDecoded = decodeURIComponent(city).replace(/-/g, " ");
        const stateDecoded = decodeURIComponent(state);
        const experienceName = experienceType.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        title = `${experienceName} in ${cityDecoded}, ${stateDecoded} | BowlingAlleys.io`;
        description = `Find ${experienceName.toLowerCase()} venues in ${cityDecoded}, ${stateDecoded}. Compare options, read reviews, and book your experience.`;
        canonicalUrl = `https://bowlingalleys.io/${experienceType}/${state}/${city}`;
      } else if (state) {
        const stateDecoded = decodeURIComponent(state);
        const experienceName = experienceType.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        title = `${experienceName} in ${stateDecoded} | BowlingAlleys.io`;
        description = `Discover ${experienceName.toLowerCase()} venues across ${stateDecoded}. Browse by city and find the perfect bowling experience.`;
        canonicalUrl = `https://bowlingalleys.io/${experienceType}/${state}`;
      }

      const html = await injectMetaTags(
        title,
        description,
        canonicalUrl,
        "https://bowlingalleys.io/attached_assets/stock_images/modern_bowling_alley_cf3b2379.jpg"
      );

      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (error) {
      console.error("Error in experience meta tag injection:", error);
      next();
    }
  });

  // Full admin only: Update venue feature flags (isTopAlley, isFoundingPartner, isSponsor)
  app.patch(
    "/api/admin/venues/:id/features",
    ...requireAuthenticatedFullAdmin,
    async (req: any, res: Response) => {
      const { id } = req.params;
      const { isTopAlley, isFoundingPartner, isSponsor } = req.body;

      // Validate that only allowed fields are being updated
      const updates: { [key: string]: boolean } = {};
      
      if (typeof isTopAlley === 'boolean') updates.isTopAlley = isTopAlley;
      if (typeof isFoundingPartner === 'boolean') updates.isFoundingPartner = isFoundingPartner;
      if (typeof isSponsor === 'boolean') updates.isSponsor = isSponsor;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid feature flags provided' });
      }

      try {
        const db = admin.firestore();
        await db.collection('venues').doc(id).update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, updated: updates });
      } catch (error: any) {
        console.error('Error updating venue features:', error);
        res.status(500).json({ error: 'Failed to update venue features' });
      }
    }
  );

  // Full admin only: Delete venue
  app.delete(
    "/api/admin/venues/:id",
    ...requireAuthenticatedFullAdmin,
    async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        const db = admin.firestore();
        
        // Delete venue
        await db.collection('venues').doc(id).delete();
        
        // Also delete all reviews for this venue
        const reviewsSnapshot = await db.collection('reviews')
          .where('venueId', '==', id)
          .get();
        
        const batch = db.batch();
        reviewsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        res.status(200).json({ success: true });
      } catch (error: any) {
        console.error('Error deleting venue:', error);
        res.status(500).json({ error: 'Failed to delete venue' });
      }
    }
  );

  const httpServer = createServer(app);

  return httpServer;
}
