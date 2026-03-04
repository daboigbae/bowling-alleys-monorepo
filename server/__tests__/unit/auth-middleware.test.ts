import type { NextFunction, Request, Response } from "express";
import {
  authenticateToken,
  requireAdmin,
  requireFullAdmin,
  requireAuthenticatedAdmin,
} from "../../auth";
import {
  mockVerifyIdToken,
  resetAuthMocks,
} from "../helpers/mock-auth";
import {
  getMockFirestore,
  resetFirestore,
  seedFirestore,
} from "../helpers/mock-firebase";

type Middleware = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

interface RequestUser {
  uid: string;
  email?: string;
}

type MockRequest = Partial<Request> & {
  headers: Record<string, string | undefined>;
  user?: RequestUser;
};

function createMockRequest(overrides: Partial<MockRequest> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

function createMockResponse(): {
  res: Response;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const res = {} as Response;
  const status = vi.fn().mockImplementation(() => res);
  const json = vi.fn().mockImplementation(() => res);
  (res as unknown as { status: ReturnType<typeof vi.fn> }).status = status;
  (res as unknown as { json: ReturnType<typeof vi.fn> }).json = json;
  return { res, status, json };
}

async function runComposedMiddlewares(
  middlewares: Middleware[],
  req: Request,
  res: Response,
): Promise<{ completed: boolean }> {
  let completed = false;

  const runAt = async (index: number): Promise<void> => {
    if (index >= middlewares.length) {
      completed = true;
      return;
    }

    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    await middlewares[index](req, res, next);
    if (nextCalled) {
      await runAt(index + 1);
    }
  };

  await runAt(0);
  return { completed };
}

describe("auth middleware", () => {
  beforeEach(() => {
    resetFirestore();
    resetAuthMocks();
  });

  describe("authenticateToken", () => {
    it("calls next() and sets req.user when valid token provided", async () => {
      const token = mockVerifyIdToken("valid-user-uid", "valid@example.com");
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual({
        uid: "valid-user-uid",
        email: "valid@example.com",
      });
      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();
    });

    it("returns 401 when no Authorization header", async () => {
      const req = createMockRequest({ headers: {} });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: "No authorization token provided" });
    });

    it("returns 401 when Authorization header doesn't start with 'Bearer '", async () => {
      const req = createMockRequest({
        headers: { authorization: "Token abc123" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: "No authorization token provided" });
    });

    it("returns 401 when token verification fails (expired, invalid)", async () => {
      const req = createMockRequest({
        headers: { authorization: "Bearer invalid-or-expired-token" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    });
  });

  describe("requireAdmin", () => {
    it("calls next() when req.user.uid is in admin list", async () => {
      seedFirestore({
        "config/app": {
          admins: ["admin-uid"],
          marketing_contributors: [],
        },
      });
      const req = createMockRequest({
        user: { uid: "admin-uid", email: "admin@example.com" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();
    });

    it("returns 401 when req.user is not set", async () => {
      const req = createMockRequest();
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: "Authentication required" });
    });

    it("returns 403 when req.user.uid is not in admin list", async () => {
      seedFirestore({
        "config/app": {
          admins: ["some-other-admin"],
          marketing_contributors: ["some-marketing-user"],
        },
      });
      const req = createMockRequest({
        user: { uid: "regular-user-uid", email: "regular@example.com" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({ error: "Admin access required" });
    });

    it("reads admin list from Firestore config/app document", async () => {
      seedFirestore({
        "config/app": {
          admins: ["firestore-admin-uid"],
          marketing_contributors: [],
        },
      });
      const firestore = getMockFirestore();
      const collectionSpy = vi.spyOn(firestore, "collection");
      const req = createMockRequest({
        user: { uid: "firestore-admin-uid", email: "firestore-admin@example.com" },
      });
      const { res } = createMockResponse();
      const next = vi.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(collectionSpy).toHaveBeenCalledWith("config");
    });
  });

  describe("requireFullAdmin", () => {
    it("calls next() for full admin UID", async () => {
      seedFirestore({
        "config/app": {
          admins: ["full-admin-uid"],
          marketing_contributors: ["marketing-user-uid"],
        },
      });
      const req = createMockRequest({
        user: { uid: "full-admin-uid", email: "full-admin@example.com" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await requireFullAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();
    });

    it("returns 403 for marketing contributor UID (admin but not full admin)", async () => {
      seedFirestore({
        "config/app": {
          admins: ["some-other-full-admin"],
          marketing_contributors: ["marketing-only-uid"],
        },
      });
      const req = createMockRequest({
        user: { uid: "marketing-only-uid", email: "marketing@example.com" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await requireFullAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({ error: "Full admin access required" });
    });

    it("returns 403 for non-admin UID", async () => {
      seedFirestore({
        "config/app": {
          admins: ["full-admin-uid"],
          marketing_contributors: [],
        },
      });
      const req = createMockRequest({
        user: { uid: "not-an-admin", email: "not-admin@example.com" },
      });
      const { res, status, json } = createMockResponse();
      const next = vi.fn();

      await requireFullAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({ error: "Full admin access required" });
    });
  });

  describe("requireAuthenticatedAdmin (composed)", () => {
    const chain = requireAuthenticatedAdmin as Middleware[];

    it("rejects unauthenticated requests (401)", async () => {
      seedFirestore({
        "config/app": {
          admins: ["admin-uid"],
          marketing_contributors: [],
        },
      });
      const req = createMockRequest({ headers: {} });
      const { res, status, json } = createMockResponse();

      const result = await runComposedMiddlewares(chain, req, res);

      expect(result.completed).toBe(false);
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: "No authorization token provided" });
    });

    it("rejects non-admin authenticated requests (403)", async () => {
      seedFirestore({
        "config/app": {
          admins: ["different-admin"],
          marketing_contributors: [],
        },
      });
      const token = mockVerifyIdToken("regular-user", "regular@example.com");
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const { res, status, json } = createMockResponse();

      const result = await runComposedMiddlewares(chain, req, res);

      expect(result.completed).toBe(false);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({ error: "Admin access required" });
    });

    it("passes admin authenticated requests", async () => {
      seedFirestore({
        "config/app": {
          admins: ["composed-admin"],
          marketing_contributors: [],
        },
      });
      const token = mockVerifyIdToken("composed-admin", "composed-admin@example.com");
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const { res, status, json } = createMockResponse();

      const result = await runComposedMiddlewares(chain, req, res);

      expect(result.completed).toBe(true);
      expect(req.user).toEqual({
        uid: "composed-admin",
        email: "composed-admin@example.com",
      });
      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();
    });
  });
});
