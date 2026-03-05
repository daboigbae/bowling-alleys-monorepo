import admin from "firebase-admin";
import { vi } from "vitest";
import { getMockFirestore } from "./mock-firebase";

export interface MockDecodedToken {
  uid: string;
  email?: string;
}

interface MockUserRecord {
  uid: string;
  email?: string;
}

interface MockCreateUserRequest {
  email?: string;
  emailVerified?: boolean;
  [key: string]: unknown;
}

interface MockAuthService {
  verifyIdToken: (token: string) => Promise<MockDecodedToken>;
  getUserByEmail: (email: string) => Promise<MockUserRecord>;
  createUser: (data: MockCreateUserRequest) => Promise<MockUserRecord>;
  createCustomToken: (uid: string) => Promise<string>;
}

interface AuthError extends Error {
  code: string;
}

type FirebaseAdminAuthMockShape = {
  auth: () => MockAuthService;
};

const queuedVerifyResponses: MockDecodedToken[] = [];
const tokenDirectory = new Map<string, MockDecodedToken>();
const usersByUid = new Map<string, MockUserRecord>();
let tokenCounter = 0;
let autoUserCounter = 0;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function createAuthError(code: string, message: string): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  return error;
}

async function verifyIdTokenImpl(token: string): Promise<MockDecodedToken> {
  const queued = queuedVerifyResponses.shift();
  if (queued) {
    return { ...queued };
  }

  const tokenData = tokenDirectory.get(token);
  if (tokenData) {
    return { ...tokenData };
  }

  throw createAuthError("auth/invalid-id-token", "unauthorized");
}

async function getUserByEmailImpl(email: string): Promise<MockUserRecord> {
  const normalizedEmail = email.toLowerCase();
  for (const user of Array.from(usersByUid.values())) {
    if (user.email?.toLowerCase() === normalizedEmail) {
      return { ...user };
    }
  }
  throw createAuthError("auth/user-not-found", "User not found");
}

async function createUserImpl(data: MockCreateUserRequest): Promise<MockUserRecord> {
  const nextUser: MockUserRecord = {
    uid: `mock-user-${autoUserCounter += 1}`,
    email: data.email,
  };
  usersByUid.set(nextUser.uid, nextUser);
  return { ...nextUser };
}

async function createCustomTokenImpl(uid: string): Promise<string> {
  return `mock-custom-token:${uid}`;
}

const verifyIdTokenMock = vi.fn(verifyIdTokenImpl);
const getUserByEmailMock = vi.fn(getUserByEmailImpl);
const createUserMock = vi.fn(createUserImpl);
const createCustomTokenMock = vi.fn(createCustomTokenImpl);

const authService: MockAuthService = {
  verifyIdToken: verifyIdTokenMock,
  getUserByEmail: getUserByEmailMock,
  createUser: createUserMock,
  createCustomToken: createCustomTokenMock,
};

const authFactoryMock = vi.fn(() => authService);
const firebaseAdminMock = admin as unknown as FirebaseAdminAuthMockShape;
firebaseAdminMock.auth = authFactoryMock;

function upsertUser(uid: string, email?: string): void {
  usersByUid.set(uid, { uid, email });
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function readConfigDoc(): Record<string, unknown> {
  return getMockFirestore().readDocument("config/app") ?? {};
}

export function resetAuthMocks(): void {
  queuedVerifyResponses.length = 0;
  tokenDirectory.clear();
  usersByUid.clear();
  tokenCounter = 0;
  autoUserCounter = 0;

  authFactoryMock.mockImplementation(() => authService);
  verifyIdTokenMock.mockImplementation(verifyIdTokenImpl);
  getUserByEmailMock.mockImplementation(getUserByEmailImpl);
  createUserMock.mockImplementation(createUserImpl);
  createCustomTokenMock.mockImplementation(createCustomTokenImpl);
}

export function generateMockToken(uid: string, email?: string): string {
  const token = `mock-token:${uid}:${tokenCounter += 1}`;
  const tokenData: MockDecodedToken = { uid, email };
  tokenDirectory.set(token, tokenData);
  upsertUser(uid, email);
  return token;
}

export function mockVerifyIdToken(uid: string, email?: string): string {
  const token = generateMockToken(uid, email);
  queuedVerifyResponses.push({ uid, email });
  return token;
}

export function mockAdminUser(uid: string): void {
  const firestore = getMockFirestore();
  const currentConfig = readConfigDoc();
  const admins = unique([...toStringArray(currentConfig.admins), uid]);
  const marketingContributors = unique([
    ...toStringArray(currentConfig.marketing_contributors),
    uid,
  ]);

  firestore.setDocument("config/app", {
    ...currentConfig,
    admins,
    marketing_contributors: marketingContributors,
  });
}

export function mockFullAdminUser(uid: string): void {
  const firestore = getMockFirestore();
  const currentConfig = readConfigDoc();
  const admins = unique([...toStringArray(currentConfig.admins), uid]);
  const marketingContributors = toStringArray(currentConfig.marketing_contributors).filter(
    (existingUid) => existingUid !== uid,
  );

  firestore.setDocument("config/app", {
    ...currentConfig,
    admins,
    marketing_contributors: marketingContributors,
  });
}

