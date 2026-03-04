import express, { type Express } from "express";
import { registerRoutes, resetServerCachesForTests } from "../../routes";
import { resetFirestore } from "./mock-firebase";
import { resetAuthMocks } from "./mock-auth";

export async function createTestApp(): Promise<Express> {
  resetFirestore();
  resetAuthMocks();
  resetServerCachesForTests();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(app);
  return app;
}

