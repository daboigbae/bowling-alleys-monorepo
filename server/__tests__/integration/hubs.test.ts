import type { Express } from "express";
import request from "supertest";
import { vi } from "vitest";
import { getMockFirestore, seedFirestore } from "../helpers/mock-firebase";
import { createTestApp } from "../helpers/test-app";

interface SeedHub {
  slug: string;
  title: string;
  topic: string;
  description: string;
  subtitle?: string;
  stateCode?: string;
}

function buildHub(overrides: Partial<SeedHub> = {}): SeedHub {
  return {
    slug: "cosmic-bowling",
    title: "Best Cosmic Bowling",
    topic: "cosmic",
    description: "Discover the best cosmic bowling spots.",
    stateCode: "US",
    ...overrides,
  };
}

function seedHubsData(): void {
  seedFirestore({
    hubs: {
      "hub-cosmic": buildHub({
        slug: "cosmic-bowling",
        title: "Best Cosmic Bowling",
        topic: "cosmic",
      }),
      "hub-leagues": buildHub({
        slug: "bowling-leagues",
        title: "Best Bowling Leagues",
        topic: "leagues",
        description: "Find league-focused bowling destinations.",
      }),
    },
  });
}

describe("Hub API endpoints", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
    seedHubsData();
  });

  describe("GET /api/hubs", () => {
    it("returns 200 with array of hubs", async () => {
      const response = await request(app).get("/api/hubs").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      const slugs = response.body.map((hub: { slug: string }) => hub.slug);
      expect(slugs).toEqual(expect.arrayContaining(["cosmic-bowling", "bowling-leagues"]));
    });

    it("returns data from cache on second call (verify no Firestore call)", async () => {
      const firestore = getMockFirestore();
      const executeQuerySpy = vi.spyOn(firestore, "executeQuery");

      const first = await request(app).get("/api/hubs").expect(200);
      expect(first.body).toHaveLength(2);
      expect(executeQuerySpy).toHaveBeenCalledTimes(1);

      const second = await request(app).get("/api/hubs").expect(200);
      expect(second.body).toHaveLength(2);
      expect(executeQuerySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/hubs/:slug", () => {
    it("returns 200 with hub detail for valid slug", async () => {
      const response = await request(app).get("/api/hubs/cosmic-bowling").expect(200);

      expect(response.body).toMatchObject({
        slug: "cosmic-bowling",
        title: "Best Cosmic Bowling",
        topic: "cosmic",
      });
    });

    it("returns 404 for non-existent slug", async () => {
      const response = await request(app).get("/api/hubs/non-existent-hub").expect(404);
      expect(response.body).toEqual({ error: "Hub not found" });
    });
  });

  describe("Hub cache behavior", () => {
    it("first call populates cache and second call reads from cache", async () => {
      const firestore = getMockFirestore();
      const executeQuerySpy = vi.spyOn(firestore, "executeQuery");

      await request(app).get("/api/hubs").expect(200);
      expect(executeQuerySpy).toHaveBeenCalledTimes(1);

      await request(app).get("/api/hubs").expect(200);
      expect(executeQuerySpy).toHaveBeenCalledTimes(1);
    });

    it("after cache expiry, next call fetches fresh from Firestore", async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date("2026-03-02T12:00:00.000Z"));

        const firestore = getMockFirestore();
        const executeQuerySpy = vi.spyOn(firestore, "executeQuery");

        const firstResponse = await request(app).get("/api/hubs").expect(200);
        expect(firstResponse.body[0].title).toBe("Best Cosmic Bowling");
        expect(executeQuerySpy).toHaveBeenCalledTimes(1);

        seedFirestore({
          hubs: {
            "hub-cosmic": buildHub({
              slug: "cosmic-bowling",
              title: "Updated Cosmic Hub Title",
              topic: "cosmic",
            }),
          },
        });

        vi.setSystemTime(new Date("2026-03-03T00:01:00.000Z"));

        const secondResponse = await request(app).get("/api/hubs").expect(200);
        expect(executeQuerySpy).toHaveBeenCalledTimes(2);
        expect(
          secondResponse.body.some(
            (hub: { slug: string; title: string }) =>
              hub.slug === "cosmic-bowling" && hub.title === "Updated Cosmic Hub Title",
          ),
        ).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("cache stale-on-error returns old data when Firestore fails", async () => {
      vi.useFakeTimers();
      let collectionSpy: { mockRestore: () => void } | undefined;

      try {
        vi.setSystemTime(new Date("2026-03-04T12:00:00.000Z"));

        const initialResponse = await request(app).get("/api/hubs").expect(200);
        expect(
          initialResponse.body.some(
            (hub: { slug: string; title: string }) =>
              hub.slug === "cosmic-bowling" && hub.title === "Best Cosmic Bowling",
          ),
        ).toBe(true);

        vi.setSystemTime(new Date("2026-03-05T00:01:00.000Z"));

        const firestore = getMockFirestore();
        const originalCollection = firestore.collection.bind(firestore);
        collectionSpy = vi
          .spyOn(firestore, "collection")
          .mockImplementation((path: string) => {
            if (path === "hubs") {
              throw new Error("Simulated hubs Firestore failure");
            }
            return originalCollection(path);
          });

        const staleResponse = await request(app).get("/api/hubs").expect(200);

        expect(
          staleResponse.body.some(
            (hub: { slug: string; title: string }) =>
              hub.slug === "cosmic-bowling" && hub.title === "Best Cosmic Bowling",
          ),
        ).toBe(true);
      } finally {
        collectionSpy?.mockRestore();
        vi.useRealTimers();
      }
    });
  });
});
