import { vi } from "vitest";

/**
 * Mock firebase-admin before any route/auth imports.
 * Setup file runs first via vitest config setupFiles, so this mock is in place
 * when test files import server/routes (which pulls in server/auth and firebase-admin).
 */
vi.mock("firebase-admin", () => {
  const emptySnapshot = {
    docs: [],
    empty: true,
    size: 0,
  };

  const createDocRef = (_col: string, id: string) => ({
    id,
    get: () =>
      Promise.resolve({
        exists: true,
        data: () => ({}),
        id,
      }),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  });

  const createCollectionRef = (name: string) => {
    const chain = {
      get: () => Promise.resolve(emptySnapshot),
      doc: (id: string) => createDocRef(name, id),
      where: () => chain,
      orderBy: () => chain,
      limit: () => ({ get: () => Promise.resolve(emptySnapshot) }),
    };
    return chain;
  };

  const firestoreMock = () => ({
    collection: (name: string) => createCollectionRef(name),
    collectionGroup: () => ({
      get: () => Promise.resolve(emptySnapshot),
    }),
  });

  (firestoreMock as { FieldValue?: { serverTimestamp: () => unknown } }).FieldValue = {
    serverTimestamp: () => ({ _serverTimestamp: true }),
  };

  return {
    default: {
      apps: [{ app: true }],
      initializeApp: () => ({}),
      credential: {
        cert: () => ({}),
      },
      firestore: firestoreMock,
      auth: () => ({
        verifyIdToken: vi.fn().mockRejectedValue(new Error("unauthorized")),
      }),
      app: () => ({
        options: { projectId: "test-project" },
      }),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
