import dotenv from "dotenv";
dotenv.config(); // Load .env before reading process.env (auth loads before index.ts runs)

import type { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try multiple env var names for project ID
    const projectId = process.env.FIREBASE_PROJECT_ID 
      || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
      || 'bowling-alleys-io';
    
    let serviceAccount: admin.ServiceAccount | null = null;

    // Option 1: Path to JSON file (e.g. FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json)
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
    if (keyPath) {
      const tryPaths = path.isAbsolute(keyPath)
        ? [keyPath]
        : [
            path.resolve(process.cwd(), keyPath),
            path.resolve(__dirname, "..", keyPath),
          ];
      let resolvedPath: string | null = null;
      for (const p of tryPaths) {
        if (fs.existsSync(p)) {
          resolvedPath = p;
          break;
        }
      }
      if (resolvedPath) {
        const raw = fs.readFileSync(resolvedPath, "utf-8");
        serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
        console.log(`[Firebase Admin] Loaded service account from ${resolvedPath}`);
      } else {
        console.warn(`[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_PATH set but file not found. Tried: ${tryPaths.join(", ")}`);
      }
    }
    // Option 2: Inline JSON string (for Railway etc.)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let keyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if ((keyStr.startsWith("'") && keyStr.endsWith("'")) || (keyStr.startsWith('"') && keyStr.endsWith('"'))) {
        keyStr = keyStr.slice(1, -1);
      }
      keyStr = keyStr.replace(/\r\n/g, "\\n").replace(/\n/g, "\\n").replace(/\r/g, "\\n");
      serviceAccount = JSON.parse(keyStr) as admin.ServiceAccount;
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      });
      console.log(`[Firebase Admin] Initialized with service account for project: ${projectId}`);
    } else {
      // Fallback for local dev: gcloud auth application-default login
      admin.initializeApp({
        projectId: projectId,
      });
      console.log(`[Firebase Admin] Initialized with default credentials for project: ${projectId}`);
      console.warn('[Firebase Admin] Warning: Using default credentials. For production, set FIREBASE_SERVICE_ACCOUNT_KEY');
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    console.error("Make sure you have:");
    console.error("  1. FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID set");
    console.error("  2. FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file) or FIREBASE_SERVICE_ACCOUNT_KEY (minified JSON string) in your .env");
    console.error("  3. Or run: gcloud auth application-default login (local dev only)");
  }
}

// Middleware to verify Firebase ID token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if authenticated user is an admin
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin by querying Firestore
    const firestore = admin.firestore();
    const configDoc = await firestore.collection('config').doc('app').get();
    
    if (!configDoc.exists) {
      console.error('App config document not found');
      return res.status(500).json({ error: 'Configuration error' });
    }
    
    const config = configDoc.data();
    const admins = config?.admins || [];
    const marketingContributors = config?.marketing_contributors || [];
    
    if (!admins.includes(req.user.uid) && !marketingContributors.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification failed:', error);
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Middleware to check if authenticated user is a full admin (not marketing contributor)
export const requireFullAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is full admin by querying Firestore
    const firestore = admin.firestore();
    const configDoc = await firestore.collection('config').doc('app').get();
    
    if (!configDoc.exists) {
      console.error('App config document not found');
      return res.status(500).json({ error: 'Configuration error' });
    }
    
    const config = configDoc.data();
    const admins = config?.admins || [];
    
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Full admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Full admin verification failed:', error);
    return res.status(500).json({ error: 'Failed to verify full admin status' });
  }
};

// Combined middleware: authenticate and require admin
export const requireAuthenticatedAdmin = [authenticateToken, requireAdmin];

// Combined middleware: authenticate and require full admin
export const requireAuthenticatedFullAdmin = [authenticateToken, requireFullAdmin];