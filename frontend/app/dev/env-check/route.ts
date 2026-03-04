import { NextResponse } from "next/server";

/**
 * Dev-only env check: hit /dev/env-check to see which env the app is using.
 * Only exposes NEXT_PUBLIC_* vars (no secrets). Restart dev server after changing .env.local.
 */
export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "(not set)";
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "(not set)";
  const hasFirebaseApiKey = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "(not set)";

  return NextResponse.json({
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
    NEXT_PUBLIC_FIREBASE_API_KEY_set: hasFirebaseApiKey,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NODE_ENV: process.env.NODE_ENV,
    hint: "Restart the Next dev server (npm run dev) after changing .env.local — NEXT_PUBLIC_* are inlined at startup.",
  });
}
