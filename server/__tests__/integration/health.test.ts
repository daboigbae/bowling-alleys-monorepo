import request from "supertest";
import express from "express";
import { registerRoutes } from "../../routes";

describe("GET /api/health", () => {
  it("returns 200 and status ok", async () => {
    const app = express();
    await registerRoutes(app);
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });
});
