import type { Express } from "express";
import request from "supertest";
import { getMockFirestore, seedFirestore } from "../helpers/mock-firebase";
import { createTestApp } from "../helpers/test-app";

interface SeedTimestamp {
  _seconds: number;
  _nanoseconds: number;
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

interface VerificationCodeDocument {
  email: string;
  code: string;
  createdAt: SeedTimestamp;
  expiresAt: SeedTimestamp | Date;
  verified: boolean;
  attempts: number;
}

function toTimestamp(date: Date): SeedTimestamp {
  const ms = date.getTime();
  const seconds = Math.floor(ms / 1000);

  return {
    _seconds: seconds,
    _nanoseconds: 0,
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(ms),
  };
}

function buildVerificationCode(overrides: Partial<VerificationCodeDocument> = {}): VerificationCodeDocument {
  return {
    email: "verify@example.com",
    code: "123456",
    createdAt: toTimestamp(new Date(Date.now() - 30_000)),
    expiresAt: toTimestamp(new Date(Date.now() + 10 * 60 * 1000)),
    verified: false,
    attempts: 0,
    ...overrides,
  };
}

function resolveToDate(value: SeedTimestamp | Date): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }
  return null;
}

describe("Auth API endpoints", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
  });

  describe("POST /api/auth/send-code", () => {
    it("returns 200 with valid email", async () => {
      const response = await request(app)
        .post("/api/auth/send-code")
        .send({ email: "valid.user@example.com" })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Verification code sent",
      });
    });

    it("returns 400 with invalid/missing email", async () => {
      const invalidPayloads: Array<Record<string, unknown>> = [{}, { email: "not-an-email" }];

      for (const payload of invalidPayloads) {
        const response = await request(app).post("/api/auth/send-code").send(payload).expect(400);
        expect(response.body).toEqual({ error: "Valid email is required" });
      }
    });

    it("returns 429 when requesting again within 60 seconds", async () => {
      const email = "ratelimit@example.com";

      await request(app).post("/api/auth/send-code").send({ email }).expect(200);
      const secondResponse = await request(app)
        .post("/api/auth/send-code")
        .send({ email })
        .expect(429);

      expect(secondResponse.body).toEqual({
        error: "Please wait at least 60 seconds before requesting another code",
      });
    });

    it("stores verification code in Firestore", async () => {
      const email = "stored-code@example.com";

      await request(app).post("/api/auth/send-code").send({ email }).expect(200);

      const firestore = getMockFirestore();
      const snapshot = await firestore
        .collection("verificationCodes")
        .where("email", "==", email.toLowerCase())
        .get();

      expect(snapshot.size).toBe(1);

      const stored = snapshot.docs[0].data() as VerificationCodeDocument;
      expect(stored.email).toBe(email.toLowerCase());
      expect(stored.code).toMatch(/^\d{6}$/);
      expect(stored.verified).toBe(false);
      expect(stored.attempts).toBe(0);
      expect(typeof stored.createdAt?.toDate).toBe("function");
      const resolvedExpiresAt = resolveToDate(stored.expiresAt);
      expect(resolvedExpiresAt).not.toBeNull();
    });
  });

  describe("POST /api/auth/verify-code", () => {
    it("returns 200 with valid code and returns custom token", async () => {
      const email = "new-user@example.com";
      const code = "246810";

      seedFirestore({
        verificationCodes: {
          "verification-doc-valid": buildVerificationCode({
            email,
            code,
          }),
        },
      });

      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({ email, code })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.customToken).toBe("string");
      expect(response.body.customToken).toMatch(/^mock-custom-token:/);

      const uid = String(response.body.customToken).replace("mock-custom-token:", "");
      const createdUserProfile = getMockFirestore().readDocument(`users/${uid}`);
      expect(createdUserProfile).toBeDefined();
      expect(createdUserProfile?.email).toBe(email.toLowerCase());
    });

    it("returns 400 with invalid code", async () => {
      const email = "invalid-code@example.com";

      seedFirestore({
        verificationCodes: {
          "verification-doc-invalid": buildVerificationCode({
            email,
            code: "111111",
            attempts: 0,
          }),
        },
      });

      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({ email, code: "999999" })
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid verification code" });

      const updatedDoc = getMockFirestore().readDocument("verificationCodes/verification-doc-invalid");
      expect(updatedDoc?.attempts).toBe(1);
      expect(updatedDoc?.verified).toBe(false);
    });

    it("returns 400 with expired code", async () => {
      const email = "expired@example.com";
      const code = "333333";

      seedFirestore({
        verificationCodes: {
          "verification-doc-expired": buildVerificationCode({
            email,
            code,
            expiresAt: toTimestamp(new Date(Date.now() - 5 * 60 * 1000)),
          }),
        },
      });

      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({ email, code })
        .expect(400);

      expect(response.body).toEqual({ error: "Verification code has expired" });
    });

    it("marks code as verified after use (can't reuse)", async () => {
      const email = "single-use@example.com";
      const code = "654321";

      seedFirestore({
        verificationCodes: {
          "verification-doc-single-use": buildVerificationCode({
            email,
            code,
          }),
        },
      });

      await request(app).post("/api/auth/verify-code").send({ email, code }).expect(200);

      const verifiedDoc = getMockFirestore().readDocument("verificationCodes/verification-doc-single-use");
      expect(verifiedDoc?.verified).toBe(true);

      const secondAttempt = await request(app)
        .post("/api/auth/verify-code")
        .send({ email, code })
        .expect(400);

      expect(secondAttempt.body).toEqual({ error: "Invalid verification code" });
    });
  });
});
