import type { Express } from "express";
import request from "supertest";
import type { Venue } from "@shared/schema";
import { seedFirestore } from "../helpers/mock-firebase";
import { mockAdminUser, mockFullAdminUser, mockVerifyIdToken } from "../helpers/mock-auth";
import { createTestApp } from "../helpers/test-app";

type SeedVenue = Omit<Venue, "id" | "createdAt" | "updatedAt"> & {
  isTopAlley?: boolean;
  isFoundingPartner?: boolean;
  ownerId?: string;
  isActive?: boolean;
};

const TEST_VENUES: Record<string, SeedVenue> = {
  "venue-tx-austin": {
    name: "Austin Strike Center",
    address: "100 Congress Ave",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    lanes: 32,
    lat: 30.2672,
    lng: -97.7431,
    avgRating: 4.9,
    reviewCount: 120,
    isTopAlley: true,
    isFoundingPartner: true,
    ownerId: "owner-1",
    isActive: true,
  },
  "venue-tx-dallas": {
    name: "Dallas Bowl House",
    address: "200 Elm St",
    city: "Dallas",
    state: "Texas",
    postalCode: "75201",
    lanes: 28,
    lat: 32.7767,
    lng: -96.797,
    avgRating: 4.7,
    reviewCount: 98,
    isTopAlley: true,
    ownerId: "owner-2",
    isActive: true,
  },
  "venue-ca-la": {
    name: "LA Pin Palace",
    address: "300 Sunset Blvd",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90012",
    lanes: 24,
    lat: 34.0522,
    lng: -118.2437,
    avgRating: 4.2,
    reviewCount: 44,
    isTopAlley: true,
    ownerId: "owner-3",
    isActive: true,
  },
  "venue-co-denver": {
    name: "Denver Roll Arena",
    address: "400 Market St",
    city: "Denver",
    state: "CO",
    postalCode: "80202",
    lanes: 20,
    lat: 39.7392,
    lng: -104.9903,
    avgRating: 3.8,
    reviewCount: 18,
    isTopAlley: false,
    ownerId: "owner-4",
    isActive: true,
  },
};

const VALID_NEW_VENUE_DATA: Omit<Venue, "id" | "avgRating" | "reviewCount" | "createdAt" | "updatedAt"> = {
  name: "Phoenix Strike Zone",
  address: "500 Desert Rd",
  city: "Phoenix",
  state: "AZ",
  postalCode: "85001",
  phone: "555-123-0000",
  website: "https://example.com/phoenix-strike-zone",
  lanes: 30,
  lat: 33.4484,
  lng: -112.074,
};

function seedBaseData(): void {
  seedFirestore({
    venues: TEST_VENUES,
    "config/app": {
      admins: ["seed-full-admin"],
      marketing_contributors: ["seed-marketing-admin"],
    },
  });
}

describe("Venue API endpoints", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
    seedBaseData();
  });

  describe("GET /api/venues", () => {
    it("returns 200 with array of venues", async () => {
      const response = await request(app).get("/api/venues").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(Object.keys(TEST_VENUES).length);

      const returnedIds = response.body.map((venue: { id: string }) => venue.id);
      expect(returnedIds).toEqual(expect.arrayContaining(Object.keys(TEST_VENUES)));
    });

    it("returns empty array when no venues exist", async () => {
      const emptyApp = await createTestApp();

      const response = await request(emptyApp).get("/api/venues").expect(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/venues/:id", () => {
    it("returns 200 with venue object for valid ID", async () => {
      const response = await request(app).get("/api/venues/venue-tx-austin").expect(200);

      expect(response.body).toMatchObject({
        id: "venue-tx-austin",
        name: "Austin Strike Center",
        city: "Austin",
        state: "TX",
      });
    });

    it("returns 404 for non-existent ID", async () => {
      const response = await request(app).get("/api/venues/non-existent-venue").expect(404);
      expect(response.body).toEqual({ error: "Venue not found" });
    });
  });

  describe("GET /api/venues/by-state/:state", () => {
    it("returns venues filtered by state", async () => {
      const response = await request(app).get("/api/venues/by-state/TX").expect(200);

      const venueIds = response.body.map((venue: { id: string }) => venue.id);
      expect(venueIds).toEqual(["venue-tx-austin", "venue-tx-dallas"]);
    });

    it("returns empty array for state with no venues", async () => {
      const response = await request(app).get("/api/venues/by-state/FL").expect(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/venues/by-state-city/:state/:city", () => {
    it("returns venues filtered by state and city", async () => {
      const response = await request(app)
        .get("/api/venues/by-state-city/TX/Austin")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: "venue-tx-austin",
        city: "Austin",
      });
    });
  });

  describe("GET /api/venues/by-proximity", () => {
    it("returns 400 when lat/lng missing", async () => {
      const response = await request(app).get("/api/venues/by-proximity").expect(400);
      expect(response.body).toEqual({ error: "lat and lng query parameters are required" });
    });

    it("returns venues within radius when lat/lng provided", async () => {
      const response = await request(app)
        .get("/api/venues/by-proximity")
        .query({ lat: 30.2672, lng: -97.7431, radius: 25 })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: "venue-tx-austin",
        name: "Austin Strike Center",
      });
      expect(typeof response.body[0].distance).toBe("number");
    });

    it("returns empty array when no venues nearby", async () => {
      const response = await request(app)
        .get("/api/venues/by-proximity")
        .query({ lat: 41.8781, lng: -87.6298, radius: 5 })
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/venues/top-alleys", () => {
    it("returns top-rated venues sorted by rating", async () => {
      const response = await request(app).get("/api/venues/top-alleys").expect(200);

      const ratings = response.body.map((venue: { avgRating?: number }) => venue.avgRating ?? 0);
      const sortedRatings = [...ratings].sort((left, right) => right - left);

      expect(response.body).toHaveLength(3);
      expect(ratings).toEqual(sortedRatings);
      expect(response.body.every((venue: { isTopAlley?: boolean }) => venue.isTopAlley)).toBe(true);
    });
  });

  describe("POST /api/venues", () => {
    it("returns 401 without auth token", async () => {
      await request(app).post("/api/venues").send(VALID_NEW_VENUE_DATA).expect(401);
    });

    it("returns 403 with non-admin auth token", async () => {
      const token = mockVerifyIdToken("regular-user", "regular@example.com");

      const response = await request(app)
        .post("/api/venues")
        .set("Authorization", `Bearer ${token}`)
        .send(VALID_NEW_VENUE_DATA)
        .expect(403);

      expect(response.body).toEqual({ error: "Admin access required" });
    });

    it("returns 201 with admin auth token and valid venue data", async () => {
      const adminUid = "admin-create-user";
      mockAdminUser(adminUid);
      const token = mockVerifyIdToken(adminUid, "admin@example.com");

      const response = await request(app)
        .post("/api/venues")
        .set("Authorization", `Bearer ${token}`)
        .send(VALID_NEW_VENUE_DATA)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toMatchObject({
        name: VALID_NEW_VENUE_DATA.name,
        city: VALID_NEW_VENUE_DATA.city,
        state: VALID_NEW_VENUE_DATA.state,
      });
    });
  });

  describe("PUT /api/venues/:id", () => {
    it("returns 401 without auth token", async () => {
      await request(app).put("/api/venues/venue-tx-austin").send({ name: "No Auth Update" }).expect(401);
    });

    it("returns 200 with auth token and updates venue data", async () => {
      const token = mockVerifyIdToken("owner-1", "owner@example.com");
      const updatePayload = { name: "Austin Strike Center Updated", lanes: 36 };

      const updateResponse = await request(app)
        .put("/api/venues/venue-tx-austin")
        .set("Authorization", `Bearer ${token}`)
        .send(updatePayload)
        .expect(200);

      expect(updateResponse.body).toMatchObject({
        id: "venue-tx-austin",
        ...updatePayload,
      });

      const fetchResponse = await request(app).get("/api/venues/venue-tx-austin").expect(200);
      expect(fetchResponse.body).toMatchObject(updatePayload);
    });
  });

  describe("DELETE /api/venues/:id", () => {
    it("returns 401 without auth token", async () => {
      await request(app).delete("/api/venues/venue-tx-austin").expect(401);
    });

    it("returns 403 with admin (non-full-admin) auth token", async () => {
      const adminNotFullUid = "marketing-admin-user";
      seedFirestore({
        "config/app": {
          admins: ["different-full-admin"],
          marketing_contributors: [adminNotFullUid],
        },
      });
      const token = mockVerifyIdToken(adminNotFullUid, "marketing@example.com");

      const response = await request(app)
        .delete("/api/venues/venue-tx-austin")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ error: "Full admin access required" });
    });

    it("returns 204 with full admin auth token", async () => {
      const fullAdminUid = "full-admin-user";
      mockFullAdminUser(fullAdminUid);
      const token = mockVerifyIdToken(fullAdminUid, "full-admin@example.com");

      await request(app)
        .delete("/api/venues/venue-tx-austin")
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app).get("/api/venues/venue-tx-austin").expect(404);
    });
  });
});

