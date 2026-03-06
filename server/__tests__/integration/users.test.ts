import type { Express } from "express";
import request from "supertest";
import { getMockFirestore, seedFirestore } from "../helpers/mock-firebase";
import { mockVerifyIdToken } from "../helpers/mock-auth";
import { createTestApp } from "../helpers/test-app";

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
  isActive: boolean;
}

interface SeedTimestamp {
  _seconds: number;
  _nanoseconds: number;
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

function createTimestamp(seconds: number): SeedTimestamp {
  return {
    _seconds: seconds,
    _nanoseconds: 0,
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000),
  };
}

function buildVenue(overrides: Partial<SeedVenue> = {}): SeedVenue {
  return {
    name: "Seed Venue",
    address: "100 League Ln",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    lanes: 28,
    lat: 30.2672,
    lng: -97.7431,
    avgRating: 4.2,
    reviewCount: 10,
    isActive: true,
    ...overrides,
  };
}

describe("User API endpoints", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
  });

  describe("GET /api/users/:userId", () => {
    it("returns 200 with user profile", async () => {
      const userId = "profile-user-1";

      seedFirestore({
        users: {
          [userId]: {
            email: "profile1@example.com",
            displayName: "Profile User One",
            photoURL: "https://example.com/profile1.png",
            createdAt: createTimestamp(100),
          },
        },
      });

      const response = await request(app).get(`/api/users/${userId}`).expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: "profile1@example.com",
        displayName: "Profile User One",
      });
    });

    it("returns 404 for non-existent user", async () => {
      const response = await request(app).get("/api/users/missing-user").expect(404);
      expect(response.body).toEqual({ error: "User not found" });
    });
  });

  describe("PUT /api/users/:userId", () => {
    it("returns 401 without auth", async () => {
      const userId = "update-user-no-auth";

      seedFirestore({
        users: {
          [userId]: {
            email: "noauth@example.com",
            displayName: "No Auth User",
          },
        },
      });

      await request(app)
        .put(`/api/users/${userId}`)
        .send({ displayName: "Should Not Update" })
        .expect(401);
    });

    it("returns 200 and updates profile with auth", async () => {
      const userId = "update-user-auth";
      const token = mockVerifyIdToken(userId, "auth-update@example.com");

      seedFirestore({
        users: {
          [userId]: {
            email: "auth-update@example.com",
            displayName: "Before Update",
            bio: "Before bio",
          },
        },
      });

      const payload = {
        displayName: "After Update",
        bio: "Updated user bio content",
      };

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(payload)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.displayName).toBe(payload.displayName);
      expect(response.body.bio).toBe(payload.bio);

      const storedUser = getMockFirestore().readDocument(`users/${userId}`);
      expect(storedUser?.displayName).toBe(payload.displayName);
      expect(storedUser?.bio).toBe(payload.bio);
    });
  });

  describe("GET /api/users/:userId/saved-alleys", () => {
    it("returns 401 without auth", async () => {
      await request(app).get("/api/users/saved-user/saved-alleys").expect(401);
    });

    it("returns 200 with saved venues array", async () => {
      const userId = "saved-user";
      const token = mockVerifyIdToken(userId, "saved-user@example.com");
      const venueA = "saved-venue-a";
      const venueB = "saved-venue-b";

      seedFirestore({
        users: {
          [userId]: {
            email: "saved-user@example.com",
            displayName: "Saved User",
          },
        },
        venues: {
          [venueA]: buildVenue({ name: "Saved Venue A", avgRating: 4.5 }),
          [venueB]: buildVenue({
            name: "Saved Venue B",
            city: "Dallas",
            lat: 32.7767,
            lng: -96.797,
            avgRating: 4.1,
          }),
        },
        [`users/${userId}/savedAlleys`]: {
          [venueA]: { venueId: venueA, savedAt: createTimestamp(200) },
          [venueB]: { venueId: venueB, savedAt: createTimestamp(300) },
        },
      });

      const response = await request(app)
        .get(`/api/users/${userId}/saved-alleys`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      const ids = response.body.map((venue: { id: string }) => venue.id);
      expect(ids).toEqual(expect.arrayContaining([venueA, venueB]));
    });
  });

  describe("POST /api/users/:userId/saved-alleys/:venueId", () => {
    it("returns 401 without auth", async () => {
      await request(app).post("/api/users/user-save/saved-alleys/venue-save").expect(401);
    });

    it("returns 201 when saving a venue", async () => {
      const userId = "save-user";
      const venueId = "save-venue";
      const token = mockVerifyIdToken(userId, "save-user@example.com");

      seedFirestore({
        users: {
          [userId]: {
            email: "save-user@example.com",
            displayName: "Save User",
          },
        },
      });

      const response = await request(app)
        .post(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(response.body).toEqual({ success: true });

      const savedDoc = getMockFirestore().readDocument(`users/${userId}/savedAlleys/${venueId}`);
      expect(savedDoc).toBeDefined();
      expect(savedDoc?.venueId).toBe(venueId);
    });
  });

  describe("DELETE /api/users/:userId/saved-alleys/:venueId", () => {
    it("returns 401 without auth", async () => {
      await request(app).delete("/api/users/user-unsave/saved-alleys/venue-unsave").expect(401);
    });

    it("returns 204 when unsaving", async () => {
      const userId = "unsave-user";
      const venueId = "unsave-venue";
      const token = mockVerifyIdToken(userId, "unsave-user@example.com");

      seedFirestore({
        users: {
          [userId]: {
            email: "unsave-user@example.com",
            displayName: "Unsave User",
          },
        },
        [`users/${userId}/savedAlleys`]: {
          [venueId]: {
            venueId,
            savedAt: createTimestamp(400),
          },
        },
      });

      await request(app)
        .delete(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const deletedDoc = getMockFirestore().readDocument(`users/${userId}/savedAlleys/${venueId}`);
      expect(deletedDoc).toBeUndefined();
    });
  });

  describe("Saved alleys idempotency", () => {
    it("saving same venue twice doesn't create duplicate entries", async () => {
      const userId = "idempotent-save-user";
      const venueId = "idempotent-save-venue";
      const token = mockVerifyIdToken(userId, "idempotent-save@example.com");

      seedFirestore({
        users: {
          [userId]: {
            email: "idempotent-save@example.com",
            displayName: "Idempotent Saver",
          },
        },
        venues: {
          [venueId]: buildVenue({ name: "Idempotent Venue", avgRating: 4.6 }),
        },
      });

      await request(app)
        .post(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      await request(app)
        .post(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      const firestore = getMockFirestore();
      const snapshot = await firestore.collection("users").doc(userId).collection("savedAlleys").get();
      expect(snapshot.size).toBe(1);

      const getResponse = await request(app)
        .get(`/api/users/${userId}/saved-alleys`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0].id).toBe(venueId);
    });

    it("unsaving then re-saving works correctly", async () => {
      const userId = "idempotent-cycle-user";
      const venueId = "idempotent-cycle-venue";
      const token = mockVerifyIdToken(userId, "idempotent-cycle@example.com");

      seedFirestore({
        users: {
          [userId]: {
            email: "idempotent-cycle@example.com",
            displayName: "Cycle User",
          },
        },
        venues: {
          [venueId]: buildVenue({ name: "Cycle Venue", avgRating: 4.3 }),
        },
      });

      await request(app)
        .post(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      await request(app)
        .delete(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app)
        .post(`/api/users/${userId}/saved-alleys/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      const savedDoc = getMockFirestore().readDocument(`users/${userId}/savedAlleys/${venueId}`);
      expect(savedDoc).toBeDefined();
      expect(savedDoc?.venueId).toBe(venueId);

      const getResponse = await request(app)
        .get(`/api/users/${userId}/saved-alleys`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0].id).toBe(venueId);
    });
  });
});
