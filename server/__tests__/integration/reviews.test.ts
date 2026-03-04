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

interface SeedReview {
  rating: number;
  text?: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: SeedTimestamp;
  updatedAt: SeedTimestamp;
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
    name: "Test Venue",
    address: "100 Test St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    lanes: 24,
    lat: 30.2672,
    lng: -97.7431,
    avgRating: 0,
    reviewCount: 0,
    isActive: true,
    ...overrides,
  };
}

function buildReview(overrides: Partial<SeedReview> = {}): SeedReview {
  return {
    rating: 4,
    text: "Great lanes and staff for family night.",
    userId: "seed-user",
    userDisplayName: "Seed User",
    createdAt: createTimestamp(100),
    updatedAt: createTimestamp(100),
    ...overrides,
  };
}

function getVenueFromList(
  venues: Array<{ id: string; avgRating?: number; reviewCount?: number }>,
  venueId: string,
): { id: string; avgRating?: number; reviewCount?: number } | undefined {
  return venues.find((venue) => venue.id === venueId);
}

describe("Review API endpoints", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
  });

  describe("GET /api/venues/:venueId/reviews", () => {
    it("returns 200 with reviews array for venue", async () => {
      const venueId = "venue-reviews-list";

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 4.5, reviewCount: 2 }),
        },
        [`venues/${venueId}/reviews`]: {
          "review-user-a": buildReview({
            userId: "review-user-a",
            userDisplayName: "Reviewer A",
            rating: 4,
            text: "Solid lanes and quick service every time.",
            createdAt: createTimestamp(200),
            updatedAt: createTimestamp(200),
          }),
          "review-user-b": buildReview({
            userId: "review-user-b",
            userDisplayName: "Reviewer B",
            rating: 5,
            text: "Loved the staff and the arcade for kids.",
            createdAt: createTimestamp(300),
            updatedAt: createTimestamp(300),
          }),
        },
      });

      const response = await request(app).get(`/api/venues/${venueId}/reviews`).expect(200);

      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.reviews).toHaveLength(2);
      expect(response.body.lastDoc).toBeNull();

      const returnedUserIds = response.body.reviews.map((review: { id: string }) => review.id);
      expect(returnedUserIds).toEqual(expect.arrayContaining(["review-user-a", "review-user-b"]));
    });

    it("returns empty array for venue with no reviews", async () => {
      const venueId = "venue-no-reviews";

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 0, reviewCount: 0 }),
        },
      });

      const response = await request(app).get(`/api/venues/${venueId}/reviews`).expect(200);
      expect(response.body).toEqual({ reviews: [], lastDoc: null });
    });
  });

  describe("GET /api/reviews/recent", () => {
    it("returns recent reviews across all venues", async () => {
      const venueA = "venue-recent-a";
      const venueB = "venue-recent-b";

      seedFirestore({
        venues: {
          [venueA]: buildVenue({ name: "Recent Venue A", avgRating: 4, reviewCount: 2 }),
          [venueB]: buildVenue({
            name: "Recent Venue B",
            city: "Dallas",
            avgRating: 5,
            reviewCount: 1,
          }),
        },
        [`venues/${venueA}/reviews`]: {
          "recent-user-a": buildReview({
            userId: "recent-user-a",
            userDisplayName: "Recent A",
            rating: 4,
            text: "Excellent experience and very clean facilities.",
            createdAt: createTimestamp(500),
            updatedAt: createTimestamp(500),
          }),
          "recent-user-b": buildReview({
            userId: "recent-user-b",
            userDisplayName: "Recent B",
            rating: 5,
            text: "Fantastic cosmic bowling and food was surprisingly good.",
            createdAt: createTimestamp(600),
            updatedAt: createTimestamp(600),
          }),
        },
        [`venues/${venueB}/reviews`]: {
          "recent-user-c": buildReview({
            userId: "recent-user-c",
            userDisplayName: "Recent C",
            rating: 5,
            text: "Best date-night spot and staff kept everything running smoothly.",
            createdAt: createTimestamp(700),
            updatedAt: createTimestamp(700),
          }),
        },
      });

      const response = await request(app).get("/api/reviews/recent").query({ limit: 10 }).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      const venueIds = response.body.map((review: { venueId: string }) => review.venueId);
      expect(venueIds).toEqual(expect.arrayContaining([venueA, venueB]));

      const createdAtSeconds = response.body.map(
        (review: { createdAt?: { _seconds?: number; seconds?: number } }) =>
          review.createdAt?._seconds ?? review.createdAt?.seconds ?? 0,
      );
      const sortedSeconds = [...createdAtSeconds].sort((left, right) => right - left);
      expect(createdAtSeconds).toEqual(sortedSeconds);
    });
  });

  describe("POST /api/reviews", () => {
    it("returns 401 without auth", async () => {
      await request(app)
        .post("/api/reviews")
        .send({ venueId: "venue-auth-required", rating: 4, text: "Needs auth." })
        .expect(401);
    });

    it("returns 400 with missing required fields (venueId, rating)", async () => {
      const token = mockVerifyIdToken("review-author-missing", "missing@example.com");

      const payloads: Array<Record<string, unknown>> = [{ rating: 4 }, { venueId: "venue-missing-rating" }];

      for (const payload of payloads) {
        await request(app)
          .post("/api/reviews")
          .set("Authorization", `Bearer ${token}`)
          .send(payload)
          .expect(400);
      }
    });

    it("returns 400 with invalid rating (0 or 6)", async () => {
      const token = mockVerifyIdToken("review-author-invalid", "invalid@example.com");
      const venueId = "venue-invalid-rating";

      seedFirestore({
        venues: {
          [venueId]: buildVenue(),
        },
      });

      for (const rating of [0, 6]) {
        await request(app)
          .post("/api/reviews")
          .set("Authorization", `Bearer ${token}`)
          .send({ venueId, rating, text: "This should be rejected for invalid rating." })
          .expect(400);
      }
    });

    it("returns 201 with valid review data and creates review in subcollection path", async () => {
      const venueId = "venue-create-review";
      const userId = "review-author-create";
      const token = mockVerifyIdToken(userId, "author@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 0, reviewCount: 0 }),
        },
      });

      const payload = {
        venueId,
        rating: 5,
        text: "Excellent lanes and super friendly team all night long.",
        userDisplayName: "Author Name",
        userPhotoURL: "https://example.com/profile.jpg",
      };

      const response = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send(payload)
        .expect(201);

      expect(response.body).toEqual({ success: true });

      const firestore = getMockFirestore();
      const storedReview = firestore.readDocument(`venues/${venueId}/reviews/${userId}`);
      const incorrectlyStoredTopLevelReview = firestore.readDocument(`reviews/${userId}`);
      const updatedVenue = firestore.readDocument(`venues/${venueId}`);

      expect(storedReview).toBeDefined();
      expect(storedReview?.rating).toBe(5);
      expect(storedReview?.userId).toBe(userId);
      expect(incorrectlyStoredTopLevelReview).toBeUndefined();
      expect(updatedVenue?.reviewCount).toBe(1);
      expect(Number(updatedVenue?.avgRating)).toBeCloseTo(5, 10);
    });
  });

  describe("DELETE /api/reviews/:venueId", () => {
    it("returns 401 without auth", async () => {
      await request(app).delete("/api/reviews/venue-delete-auth-required").expect(401);
    });

    it("returns 204 when deleting own review", async () => {
      const venueId = "venue-delete-own-review";
      const userId = "delete-own-user";
      const token = mockVerifyIdToken(userId, "delete-own@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 4, reviewCount: 1 }),
        },
        [`venues/${venueId}/reviews`]: {
          [userId]: buildReview({
            userId,
            userDisplayName: "Delete Own User",
            rating: 4,
            text: "Review that will be deleted by owner.",
            createdAt: createTimestamp(800),
            updatedAt: createTimestamp(800),
          }),
        },
      });

      await request(app)
        .delete(`/api/reviews/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const firestore = getMockFirestore();
      const deletedReview = firestore.readDocument(`venues/${venueId}/reviews/${userId}`);
      const updatedVenue = firestore.readDocument(`venues/${venueId}`);

      expect(deletedReview).toBeUndefined();
      expect(updatedVenue?.reviewCount).toBe(0);
      expect(Number(updatedVenue?.avgRating)).toBeCloseTo(0, 10);
    });
  });

  describe("Double-trigger prevention + cache behavior", () => {
    it("creating same review twice updates existing review and does not create duplicate", async () => {
      const venueId = "venue-double-trigger-sequential";
      const userId = "repeat-review-user";
      const token = mockVerifyIdToken(userId, "repeat@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 0, reviewCount: 0 }),
        },
      });

      await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          venueId,
          rating: 2,
          text: "First draft review text before update.",
          userDisplayName: "Repeat Reviewer",
        })
        .expect(201);

      await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          venueId,
          rating: 5,
          text: "Updated final review text after second submit.",
          userDisplayName: "Repeat Reviewer",
        })
        .expect(201);

      const firestore = getMockFirestore();
      const reviewsSnapshot = await firestore
        .collection("venues")
        .doc(venueId)
        .collection("reviews")
        .get();
      const finalReview = firestore.readDocument(`venues/${venueId}/reviews/${userId}`);
      const updatedVenue = firestore.readDocument(`venues/${venueId}`);

      expect(reviewsSnapshot.size).toBe(1);
      expect(finalReview?.text).toBe("Updated final review text after second submit.");
      expect(finalReview?.rating).toBe(5);
      expect(updatedVenue?.reviewCount).toBe(1);
      expect(Number(updatedVenue?.avgRating)).toBeCloseTo(5, 10);
    });

    it("rapid concurrent POST requests from same user create only one review", async () => {
      const venueId = "venue-double-trigger-concurrent";
      const userId = "concurrent-review-user";
      const token = mockVerifyIdToken(userId, "concurrent@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 0, reviewCount: 0 }),
        },
      });

      const createRequests = Array.from({ length: 8 }, () =>
        request(app)
          .post("/api/reviews")
          .set("Authorization", `Bearer ${token}`)
          .send({
            venueId,
            rating: 4,
            text: "Concurrent write should still result in one review document.",
            userDisplayName: "Concurrent Reviewer",
          }),
      );

      const responses = await Promise.all(createRequests);
      for (const response of responses) {
        expect(response.status).toBe(201);
      }

      const firestore = getMockFirestore();
      const reviewsSnapshot = await firestore
        .collection("venues")
        .doc(venueId)
        .collection("reviews")
        .get();
      const updatedVenue = firestore.readDocument(`venues/${venueId}`);

      expect(reviewsSnapshot.size).toBe(1);
      expect(updatedVenue?.reviewCount).toBe(1);
      expect(Number(updatedVenue?.avgRating)).toBeCloseTo(4, 10);
    });

    it("after review creation, GET returns updated venue with correct average rating", async () => {
      const venueId = "venue-rating-after-create";
      const existingUserId = "existing-rating-user";
      const newUserId = "new-rating-user";
      const token = mockVerifyIdToken(newUserId, "new-rating@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 4, reviewCount: 1 }),
        },
        [`venues/${venueId}/reviews`]: {
          [existingUserId]: buildReview({
            userId: existingUserId,
            userDisplayName: "Existing Reviewer",
            rating: 4,
            text: "Existing review to establish current average.",
            createdAt: createTimestamp(1000),
            updatedAt: createTimestamp(1000),
          }),
        },
      });

      await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          venueId,
          rating: 2,
          text: "New lower rating to verify average recalculation.",
          userDisplayName: "New Reviewer",
        })
        .expect(201);

      const venueResponse = await request(app).get(`/api/venues/${venueId}`).expect(200);
      expect(venueResponse.body.reviewCount).toBe(2);
      expect(Number(venueResponse.body.avgRating)).toBeCloseTo(3, 10);
    });

    it("after review deletion, GET returns updated venue with recalculated rating", async () => {
      const venueId = "venue-rating-after-delete";
      const deletingUserId = "delete-rating-user";
      const remainingUserId = "remaining-rating-user";
      const token = mockVerifyIdToken(deletingUserId, "delete-rating@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 4, reviewCount: 2 }),
        },
        [`venues/${venueId}/reviews`]: {
          [deletingUserId]: buildReview({
            userId: deletingUserId,
            userDisplayName: "Deleting Reviewer",
            rating: 5,
            text: "Five star review that will be removed.",
            createdAt: createTimestamp(1200),
            updatedAt: createTimestamp(1200),
          }),
          [remainingUserId]: buildReview({
            userId: remainingUserId,
            userDisplayName: "Remaining Reviewer",
            rating: 3,
            text: "Three star review that stays after deletion.",
            createdAt: createTimestamp(1250),
            updatedAt: createTimestamp(1250),
          }),
        },
      });

      await request(app)
        .delete(`/api/reviews/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const venueResponse = await request(app).get(`/api/venues/${venueId}`).expect(200);
      expect(venueResponse.body.reviewCount).toBe(1);
      expect(Number(venueResponse.body.avgRating)).toBeCloseTo(3, 10);
    });

    it("cache reflects new data after review write operations", async () => {
      const venueId = "venue-cache-consistency";
      const existingUserId = "cache-existing-user";
      const newUserId = "cache-new-user";
      const token = mockVerifyIdToken(newUserId, "cache-new@example.com");

      seedFirestore({
        venues: {
          [venueId]: buildVenue({ avgRating: 4, reviewCount: 1 }),
        },
        [`venues/${venueId}/reviews`]: {
          [existingUserId]: buildReview({
            userId: existingUserId,
            userDisplayName: "Cache Existing",
            rating: 4,
            text: "Existing cached review before write operations.",
            createdAt: createTimestamp(1400),
            updatedAt: createTimestamp(1400),
          }),
        },
      });

      await request(app).get("/api/venues").expect(200);
      await request(app).get(`/api/venues/${venueId}/reviews`).expect(200);

      await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          venueId,
          rating: 2,
          text: "New review inserted after caches were already warmed.",
          userDisplayName: "Cache New",
        })
        .expect(201);

      const venuesAfterCreateResponse = await request(app).get("/api/venues").expect(200);
      const venueAfterCreate = getVenueFromList(venuesAfterCreateResponse.body, venueId);
      expect(venueAfterCreate).toBeDefined();
      expect(venueAfterCreate?.reviewCount).toBe(2);
      expect(Number(venueAfterCreate?.avgRating)).toBeCloseTo(3, 10);

      const reviewsAfterCreateResponse = await request(app)
        .get(`/api/venues/${venueId}/reviews`)
        .expect(200);
      expect(reviewsAfterCreateResponse.body.reviews).toHaveLength(2);
      const reviewIdsAfterCreate = reviewsAfterCreateResponse.body.reviews.map(
        (review: { id: string }) => review.id,
      );
      expect(reviewIdsAfterCreate).toEqual(expect.arrayContaining([existingUserId, newUserId]));

      await request(app)
        .delete(`/api/reviews/${venueId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const venuesAfterDeleteResponse = await request(app).get("/api/venues").expect(200);
      const venueAfterDelete = getVenueFromList(venuesAfterDeleteResponse.body, venueId);
      expect(venueAfterDelete).toBeDefined();
      expect(venueAfterDelete?.reviewCount).toBe(1);
      expect(Number(venueAfterDelete?.avgRating)).toBeCloseTo(4, 10);

      const reviewsAfterDeleteResponse = await request(app)
        .get(`/api/venues/${venueId}/reviews`)
        .expect(200);
      expect(reviewsAfterDeleteResponse.body.reviews).toHaveLength(1);
      expect(reviewsAfterDeleteResponse.body.reviews[0].id).toBe(existingUserId);
    });
  });
});
