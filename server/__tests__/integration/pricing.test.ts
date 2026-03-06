import type { Express } from "express";
import request from "supertest";
import { seedFirestore } from "../helpers/mock-firebase";
import { createTestApp } from "../helpers/test-app";

interface PricingAggregate {
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

function currentReportDate(): string {
  return new Date().toISOString().split("T")[0];
}

function buildAggregate(overrides: Partial<PricingAggregate> = {}): PricingAggregate {
  return {
    averageHourlyPrice: 42,
    averageGamePrice: 7,
    averageShoeRentalPrice: 5,
    venueCount: 10,
    venuesWithGamePricing: 10,
    venuesWithHourlyPricing: 10,
    venuesWithShoeRentalPricing: 10,
    lastUpdated: "2026-03-03T00:00:00.000Z",
    ...overrides,
  };
}

function seedPricingReport(date: string): void {
  seedFirestore({
    [`reports/${date}/usa/average`]: buildAggregate({
      averageHourlyPrice: 47,
      averageGamePrice: 8.1,
      averageShoeRentalPrice: 4.8,
      venueCount: 150,
      venuesWithGamePricing: 140,
      venuesWithHourlyPricing: 120,
      venuesWithShoeRentalPricing: 135,
      lastUpdated: `${date}T00:00:00.000Z`,
    }),
    [`reports/${date}/states`]: {
      TX: buildAggregate({
        state: "TX",
        averageHourlyPrice: 39,
        averageGamePrice: 6.5,
        averageShoeRentalPrice: 4.4,
        venueCount: 30,
        venuesWithGamePricing: 29,
        venuesWithHourlyPricing: 27,
        venuesWithShoeRentalPricing: 28,
        lastUpdated: `${date}T00:00:00.000Z`,
      }),
      CA: buildAggregate({
        state: "CA",
        averageHourlyPrice: 52,
        averageGamePrice: 9.8,
        averageShoeRentalPrice: 5.6,
        venueCount: 45,
        venuesWithGamePricing: 43,
        venuesWithHourlyPricing: 41,
        venuesWithShoeRentalPricing: 44,
        lastUpdated: `${date}T00:00:00.000Z`,
      }),
      CO: buildAggregate({
        state: "CO",
        averageHourlyPrice: 35,
        averageGamePrice: 5.9,
        averageShoeRentalPrice: 4.2,
        venueCount: 15,
        venuesWithGamePricing: 15,
        venuesWithHourlyPricing: 15,
        venuesWithShoeRentalPricing: 14,
        lastUpdated: `${date}T00:00:00.000Z`,
      }),
    },
    [`reports/${date}/cities`]: {
      "Austin-TX": buildAggregate({
        city: "Austin",
        state: "TX",
        averageHourlyPrice: 38,
        averageGamePrice: 6.3,
      }),
      "San-Antonio-TX": buildAggregate({
        city: "San Antonio",
        state: "TX",
        averageHourlyPrice: 37,
        averageGamePrice: 6.1,
      }),
      "Los-Angeles-CA": buildAggregate({
        city: "Los Angeles",
        state: "CA",
        averageHourlyPrice: 53,
        averageGamePrice: 10.1,
      }),
    },
  });
}

describe("Pricing API endpoints", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
    seedPricingReport(currentReportDate());
  });

  describe("GET /api/pricing/usa", () => {
    it("returns 200 with national pricing stats", async () => {
      const response = await request(app).get("/api/pricing/usa").expect(200);

      expect(response.body).toMatchObject({
        averageHourlyPrice: 47,
        averageGamePrice: 8.1,
        averageShoeRentalPrice: 4.8,
        venueCount: 150,
        venuesWithGamePricing: 140,
        venuesWithHourlyPricing: 120,
        venuesWithShoeRentalPricing: 135,
      });
    });
  });

  describe("GET /api/pricing/state/:state", () => {
    it("returns 200 with state pricing data", async () => {
      const response = await request(app).get("/api/pricing/state/tx").expect(200);

      expect(response.body).toMatchObject({
        state: "TX",
        averageHourlyPrice: 39,
        averageGamePrice: 6.5,
        averageShoeRentalPrice: 4.4,
        venueCount: 30,
      });
    });

    it("returns appropriate response for non-existent state", async () => {
      const response = await request(app).get("/api/pricing/state/ZZ").expect(404);
      expect(response.body).toEqual({ error: "Pricing data not found" });
    });
  });

  describe("GET /api/pricing/cities/:state", () => {
    it("returns 200 with cities list for state", async () => {
      const response = await request(app).get("/api/pricing/cities/TX").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual(["Austin", "San Antonio"]);
    });
  });

  describe("GET /api/pricing/extremes", () => {
    it("returns 200 with highest/lowest pricing venues", async () => {
      const response = await request(app).get("/api/pricing/extremes").expect(200);

      expect(response.body).toMatchObject({
        cheapestByGame: { state: "CO", gamePrice: 5.9 },
        mostExpensiveByGame: { state: "CA", gamePrice: 9.8 },
        cheapestByHour: { state: "CO", hourlyPrice: 35 },
        mostExpensiveByHour: { state: "CA", hourlyPrice: 52 },
        reportDate: currentReportDate(),
      });
    });
  });
});
