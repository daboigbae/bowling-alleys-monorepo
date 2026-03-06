import type { Express } from "express";
import request from "supertest";
import { seedFirestore } from "../helpers/mock-firebase";
import { createTestApp } from "../helpers/test-app";

type Shape =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "object"
  | Array<Shape | Record<string, Shape>>
  | Record<string, Shape>;

interface SeedVenue {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  lanes: number;
  lat: number;
  lng: number;
  avgRating: number;
  reviewCount: number;
  isTopAlley: boolean;
  isFoundingPartner: boolean;
  isActive: boolean;
}

interface SeedHub {
  slug: string;
  title: string;
  topic: string;
  description: string;
  subtitle?: string;
  stateCode?: string;
}

interface SeedPricingAggregate {
  averageHourlyPrice: number;
  averageGamePrice: number;
  averageShoeRentalPrice: number;
  venueCount: number;
  venuesWithGamePricing: number;
  venuesWithHourlyPricing: number;
  venuesWithShoeRentalPricing: number;
  lastUpdated: string;
  state?: string;
  city?: string;
}

function extractShape(value: unknown): Shape {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ["undefined"];
    }
    return [extractShape(value[0])];
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return valueType;
  }

  if (valueType === "undefined") {
    return "undefined";
  }

  if (valueType === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
    const shape: Record<string, Shape> = {};
    for (const key of keys) {
      shape[key] = extractShape(record[key]);
    }
    return shape;
  }

  return "object";
}

function buildVenue(overrides: Partial<SeedVenue> = {}): SeedVenue {
  return {
    name: "Contract Venue",
    address: "100 Contract Ave",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    lanes: 24,
    lat: 30.2672,
    lng: -97.7431,
    avgRating: 4.2,
    reviewCount: 0,
    isTopAlley: false,
    isFoundingPartner: false,
    isActive: true,
    ...overrides,
  };
}

function buildHub(overrides: Partial<SeedHub> = {}): SeedHub {
  return {
    slug: "cosmic-bowling",
    title: "Best Cosmic Bowling",
    topic: "cosmic",
    description: "Find top cosmic bowling alleys.",
    stateCode: "US",
    ...overrides,
  };
}

function buildPricingAggregate(overrides: Partial<SeedPricingAggregate> = {}): SeedPricingAggregate {
  return {
    averageHourlyPrice: 42,
    averageGamePrice: 7,
    averageShoeRentalPrice: 5,
    venueCount: 10,
    venuesWithGamePricing: 10,
    venuesWithHourlyPricing: 9,
    venuesWithShoeRentalPricing: 8,
    lastUpdated: "2026-03-04T00:00:00.000Z",
    ...overrides,
  };
}

function createTimestamp(seconds: number): {
  _seconds: number;
  _nanoseconds: number;
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
} {
  return {
    _seconds: seconds,
    _nanoseconds: 0,
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000),
  };
}

describe("GET endpoint response contract snapshots", () => {
  let app: Express;
  let seededBlogSlug = "";
  const venueId = "contract-venue-a";
  const userId = "contract-user-1";
  const hubSlug = "cosmic-bowling";

  beforeAll(async () => {
    app = await createTestApp();
    const reportDate = new Date().toISOString().split("T")[0];

    seedFirestore({
      venues: {
        [venueId]: buildVenue({
          name: "Contract Venue A",
          city: "Austin",
          state: "TX",
          lat: 30.2672,
          lng: -97.7431,
          avgRating: 4.5,
          reviewCount: 2,
          isTopAlley: true,
          isFoundingPartner: true,
        }),
        "contract-venue-b": buildVenue({
          name: "Contract Venue B",
          city: "Dallas",
          state: "TX",
          lat: 32.7767,
          lng: -96.797,
          avgRating: 4.1,
          reviewCount: 1,
          isTopAlley: true,
        }),
        "contract-venue-c": buildVenue({
          name: "Contract Venue C",
          city: "Los Angeles",
          state: "CA",
          lat: 34.0522,
          lng: -118.2437,
          avgRating: 3.8,
          reviewCount: 0,
        }),
      },
      [`venues/${venueId}/reviews`]: {
        "review-user-a": {
          rating: 5,
          text: "Fantastic venue with excellent lanes and staff support.",
          userId: "review-user-a",
          userDisplayName: "Reviewer A",
          createdAt: createTimestamp(1_710_000_000),
          updatedAt: createTimestamp(1_710_000_000),
        },
        "review-user-b": {
          rating: 4,
          text: "Great value and friendly atmosphere all evening long.",
          userId: "review-user-b",
          userDisplayName: "Reviewer B",
          createdAt: createTimestamp(1_710_000_100),
          updatedAt: createTimestamp(1_710_000_100),
        },
      },
      "venues/contract-venue-b/reviews/review-user-c": {
        rating: 4,
        text: "Solid league night experience and fast service.",
        userId: "review-user-c",
        userDisplayName: "Reviewer C",
        createdAt: createTimestamp(1_710_000_200),
        updatedAt: createTimestamp(1_710_000_200),
      },
      users: {
        [userId]: {
          email: "contract-user@example.com",
          displayName: "Contract User",
          slug: "contract-user",
          photoURL: "https://example.com/contract-user.png",
          createdAt: createTimestamp(1_710_000_300),
        },
      },
      hubs: {
        "hub-cosmic": buildHub({
          slug: hubSlug,
          title: "Best Cosmic Bowling",
          topic: "cosmic",
        }),
        "hub-leagues": buildHub({
          slug: "bowling-leagues",
          title: "Best Bowling Leagues",
          topic: "leagues",
          description: "Find bowling league directories and guides.",
        }),
      },
      amenities: {
        "amenity-arcade": {
          name: "Arcade",
          description: "Arcade games for all ages",
        },
        "amenity-food": {
          name: "Food Service",
          description: "On-site food and drinks",
        },
      },
      [`reports/${reportDate}/usa/average`]: buildPricingAggregate({
        averageHourlyPrice: 47,
        averageGamePrice: 8.1,
        averageShoeRentalPrice: 4.8,
        venueCount: 150,
        venuesWithGamePricing: 140,
        venuesWithHourlyPricing: 120,
        venuesWithShoeRentalPricing: 135,
        lastUpdated: `${reportDate}T00:00:00.000Z`,
      }),
      [`reports/${reportDate}/states`]: {
        TX: buildPricingAggregate({
          state: "TX",
          averageHourlyPrice: 39,
          averageGamePrice: 6.5,
          averageShoeRentalPrice: 4.4,
          venueCount: 30,
          lastUpdated: `${reportDate}T00:00:00.000Z`,
        }),
        CA: buildPricingAggregate({
          state: "CA",
          averageHourlyPrice: 52,
          averageGamePrice: 9.8,
          averageShoeRentalPrice: 5.6,
          venueCount: 45,
          lastUpdated: `${reportDate}T00:00:00.000Z`,
        }),
        CO: buildPricingAggregate({
          state: "CO",
          averageHourlyPrice: 35,
          averageGamePrice: 5.9,
          averageShoeRentalPrice: 4.2,
          venueCount: 15,
          lastUpdated: `${reportDate}T00:00:00.000Z`,
        }),
      },
      [`reports/${reportDate}/cities`]: {
        "Austin-TX": buildPricingAggregate({
          city: "Austin",
          state: "TX",
          averageHourlyPrice: 38,
          averageGamePrice: 6.3,
        }),
        "Houston-TX": buildPricingAggregate({
          city: "Houston",
          state: "TX",
          averageHourlyPrice: 40,
          averageGamePrice: 6.7,
        }),
        "Los-Angeles-CA": buildPricingAggregate({
          city: "Los Angeles",
          state: "CA",
          averageHourlyPrice: 53,
          averageGamePrice: 10.1,
        }),
      },
    });

    const blogResponse = await request(app).get("/api/blog").expect(200);
    const firstBlog = Array.isArray(blogResponse.body) ? blogResponse.body[0] : null;
    if (!firstBlog || typeof firstBlog.slug !== "string" || firstBlog.slug.length === 0) {
      throw new Error("Expected at least one blog post with a slug for response contract tests");
    }
    seededBlogSlug = firstBlog.slug;
  });

  it("snapshots /api/health", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "status": "string",
        "timestamp": "string",
      }
    `);
  });

  it("snapshots /api/venues array shape and individual venue shape", async () => {
    const response = await request(app).get("/api/venues").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "address": "string",
          "avgRating": "number",
          "city": "string",
          "id": "string",
          "isActive": "boolean",
          "isFoundingPartner": "boolean",
          "isTopAlley": "boolean",
          "lanes": "number",
          "lat": "number",
          "lng": "number",
          "name": "string",
          "postalCode": "string",
          "reviewCount": "number",
          "state": "string",
        },
      ]
    `);
    expect(extractShape(response.body[0])).toMatchInlineSnapshot(`
      {
        "address": "string",
        "avgRating": "number",
        "city": "string",
        "id": "string",
        "isActive": "boolean",
        "isFoundingPartner": "boolean",
        "isTopAlley": "boolean",
        "lanes": "number",
        "lat": "number",
        "lng": "number",
        "name": "string",
        "postalCode": "string",
        "reviewCount": "number",
        "state": "string",
      }
    `);
  });

  it("snapshots /api/venues/:id", async () => {
    const response = await request(app).get(`/api/venues/${venueId}`).expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "address": "string",
        "avgRating": "number",
        "city": "string",
        "id": "string",
        "isActive": "boolean",
        "isFoundingPartner": "boolean",
        "isTopAlley": "boolean",
        "lanes": "number",
        "lat": "number",
        "lng": "number",
        "name": "string",
        "postalCode": "string",
        "reviewCount": "number",
        "state": "string",
      }
    `);
  });

  it("snapshots /api/venues/by-state/:state", async () => {
    const response = await request(app).get("/api/venues/by-state/TX").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "address": "string",
          "avgRating": "number",
          "city": "string",
          "id": "string",
          "isActive": "boolean",
          "isFoundingPartner": "boolean",
          "isTopAlley": "boolean",
          "lanes": "number",
          "lat": "number",
          "lng": "number",
          "name": "string",
          "postalCode": "string",
          "reviewCount": "number",
          "state": "string",
        },
      ]
    `);
  });

  it("snapshots /api/venues/by-proximity", async () => {
    const response = await request(app)
      .get("/api/venues/by-proximity")
      .query({ lat: 30.2672, lng: -97.7431, radius: 100 })
      .expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "address": "string",
          "avgRating": "number",
          "city": "string",
          "distance": "number",
          "id": "string",
          "isActive": "boolean",
          "isFoundingPartner": "boolean",
          "isTopAlley": "boolean",
          "lanes": "number",
          "lat": "number",
          "lng": "number",
          "name": "string",
          "postalCode": "string",
          "reviewCount": "number",
          "state": "string",
        },
      ]
    `);
  });

  it("snapshots /api/venues/top-alleys", async () => {
    const response = await request(app).get("/api/venues/top-alleys").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "address": "string",
          "avgRating": "number",
          "city": "string",
          "id": "string",
          "isActive": "boolean",
          "isFoundingPartner": "boolean",
          "isTopAlley": "boolean",
          "lanes": "number",
          "lat": "number",
          "lng": "number",
          "name": "string",
          "postalCode": "string",
          "reviewCount": "number",
          "state": "string",
        },
      ]
    `);
  });

  it("snapshots /api/venues/founding-partners", async () => {
    const response = await request(app).get("/api/venues/founding-partners").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "address": "string",
          "avgRating": "number",
          "city": "string",
          "id": "string",
          "isActive": "boolean",
          "isFoundingPartner": "boolean",
          "isTopAlley": "boolean",
          "lanes": "number",
          "lat": "number",
          "lng": "number",
          "name": "string",
          "postalCode": "string",
          "reviewCount": "number",
          "state": "string",
        },
      ]
    `);
  });

  it("snapshots /api/venues/stats/by-state", async () => {
    const response = await request(app).get("/api/venues/stats/by-state").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "abbreviation": "string",
          "count": "number",
        },
      ]
    `);
  });

  it("snapshots /api/venues/:venueId/reviews", async () => {
    const response = await request(app).get(`/api/venues/${venueId}/reviews`).expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "lastDoc": "null",
        "reviews": [
          {
            "createdAt": {
              "_nanoseconds": "number",
              "_seconds": "number",
              "nanoseconds": "number",
              "seconds": "number",
            },
            "id": "string",
            "rating": "number",
            "text": "string",
            "updatedAt": {
              "_nanoseconds": "number",
              "_seconds": "number",
              "nanoseconds": "number",
              "seconds": "number",
            },
            "userDisplayName": "string",
            "userId": "string",
          },
        ],
      }
    `);
  });

  it("snapshots /api/reviews/recent", async () => {
    const response = await request(app).get("/api/reviews/recent").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "createdAt": {
            "_nanoseconds": "number",
            "_seconds": "number",
            "nanoseconds": "number",
            "seconds": "number",
          },
          "id": "string",
          "rating": "number",
          "text": "string",
          "updatedAt": {
            "_nanoseconds": "number",
            "_seconds": "number",
            "nanoseconds": "number",
            "seconds": "number",
          },
          "userDisplayName": "string",
          "userId": "string",
          "venueId": "string",
          "venueName": "string",
        },
      ]
    `);
  });

  it("snapshots /api/users/:userId", async () => {
    const response = await request(app).get(`/api/users/${userId}`).expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "createdAt": {
          "_nanoseconds": "number",
          "_seconds": "number",
          "nanoseconds": "number",
          "seconds": "number",
        },
        "displayName": "string",
        "email": "string",
        "id": "string",
        "photoURL": "string",
        "slug": "string",
      }
    `);
  });

  it("snapshots /api/users/by-slug/:slug", async () => {
    const response = await request(app).get("/api/users/by-slug/contract-user").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "createdAt": {
          "_nanoseconds": "number",
          "_seconds": "number",
          "nanoseconds": "number",
          "seconds": "number",
        },
        "displayName": "string",
        "email": "string",
        "id": "string",
        "photoURL": "string",
        "slug": "string",
      }
    `);
  });

  it("snapshots /api/pricing/usa", async () => {
    const response = await request(app).get("/api/pricing/usa").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "averageGamePrice": "number",
        "averageHourlyPrice": "number",
        "averageShoeRentalPrice": "number",
        "lastUpdated": "string",
        "venueCount": "number",
        "venuesWithGamePricing": "number",
        "venuesWithHourlyPricing": "number",
        "venuesWithShoeRentalPricing": "number",
      }
    `);
  });

  it("snapshots /api/pricing/state/:state", async () => {
    const response = await request(app).get("/api/pricing/state/TX").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "averageGamePrice": "number",
        "averageHourlyPrice": "number",
        "averageShoeRentalPrice": "number",
        "lastUpdated": "string",
        "state": "string",
        "venueCount": "number",
        "venuesWithGamePricing": "number",
        "venuesWithHourlyPricing": "number",
        "venuesWithShoeRentalPricing": "number",
      }
    `);
  });

  it("snapshots /api/pricing/cities/:state", async () => {
    const response = await request(app).get("/api/pricing/cities/TX").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        "string",
      ]
    `);
  });

  it("snapshots /api/pricing/extremes", async () => {
    const response = await request(app).get("/api/pricing/extremes").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "cheapestByGame": {
          "gamePrice": "number",
          "state": "string",
        },
        "cheapestByHour": {
          "hourlyPrice": "number",
          "state": "string",
        },
        "mostExpensiveByGame": {
          "gamePrice": "number",
          "state": "string",
        },
        "mostExpensiveByHour": {
          "hourlyPrice": "number",
          "state": "string",
        },
        "reportDate": "string",
      }
    `);
  });

  it("snapshots /api/hubs", async () => {
    const response = await request(app).get("/api/hubs").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "description": "string",
          "id": "string",
          "slug": "string",
          "stateCode": "string",
          "title": "string",
          "topic": "string",
        },
      ]
    `);
  });

  it("snapshots /api/hubs/:slug", async () => {
    const response = await request(app).get(`/api/hubs/${hubSlug}`).expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "description": "string",
        "id": "string",
        "slug": "string",
        "stateCode": "string",
        "title": "string",
        "topic": "string",
      }
    `);
  });

  it("snapshots /api/blog", async () => {
    const response = await request(app).get("/api/blog").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "author": "string",
          "content": "string",
          "date": "string",
          "description": "string",
          "slug": "string",
          "tags": [
            "string",
          ],
          "title": "string",
        },
      ]
    `);
  });

  it("snapshots /api/blog/:slug", async () => {
    const response = await request(app).get(`/api/blog/${seededBlogSlug}`).expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      {
        "author": "string",
        "content": "string",
        "date": "string",
        "description": "string",
        "slug": "string",
        "tags": [
          "string",
        ],
        "title": "string",
      }
    `);
  });

  it("snapshots /api/amenities", async () => {
    const response = await request(app).get("/api/amenities").expect(200);
    expect(extractShape(response.body)).toMatchInlineSnapshot(`
      [
        {
          "description": "string",
          "id": "string",
          "name": "string",
        },
      ]
    `);
  });
});
