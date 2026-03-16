import { google } from "googleapis";
import { config } from "dotenv";
import { subDays, format } from "date-fns";
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../.env") });

const siteUrl = process.env.GSC_SITE_URL;
if (!siteUrl) throw new Error("GSC_SITE_URL is required in .env");

// Load credentials explicitly from the JSON key file
const credentialsPath = resolve(
  __dirname,
  "..",
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./service-account.json"
);
const credentials = JSON.parse(readFileSync(credentialsPath, "utf-8"));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

const searchconsole = google.searchconsole({ version: "v1", auth });

// Helper: list all sites the service account can access (for debugging)
export async function listSites() {
  const res = await searchconsole.sites.list();
  return res.data.siteEntry ?? [];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GSCMetrics {
  period: { start: string; end: string };
  overview: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  queryGroups: {
    branded: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    nonBranded: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    nearMiss: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    lowHanging: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  };
  deviceBreakdown: Array<{
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function queryGSC(
  startDate: string,
  endDate: string,
  dimensions: string[],
  rowLimit: number = 100
) {
  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: "final",
    },
  });
  return res.data.rows ?? [];
}

function isBranded(query: string): boolean {
  const brandTerms = ["bowlingalleys", "bowling alleys io", "bowlingalleys.io"];
  const q = query.toLowerCase();
  return brandTerms.some((term) => q.includes(term));
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

export async function fetchGSCData(daysBack: number = 7): Promise<GSCMetrics> {
  // GSC data has a 2-3 day lag, so offset accordingly
  const startDate = format(subDays(new Date(), daysBack + 3), "yyyy-MM-dd");
  const endDate = format(subDays(new Date(), 3), "yyyy-MM-dd");

  // 1. Top queries
  const queryRows = await queryGSC(startDate, endDate, ["query"], 500);
  const topQueries = queryRows.map((row: any) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  // 2. Top pages
  const pageRows = await queryGSC(startDate, endDate, ["page"], 200);
  const topPages = pageRows.map((row: any) => ({
    page: row.keys[0].replace(siteUrl!, ""),
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  // 3. Device breakdown
  const deviceRows = await queryGSC(startDate, endDate, ["device"]);
  const deviceBreakdown = deviceRows.map((row: any) => ({
    device: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  // 4. Country breakdown
  const countryRows = await queryGSC(startDate, endDate, ["country"], 20);
  const countryBreakdown = countryRows.map((row: any) => ({
    country: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  // 5. Compute overview totals
  const overview = topQueries.reduce(
    (acc, q) => ({
      clicks: acc.clicks + q.clicks,
      impressions: acc.impressions + q.impressions,
      ctr: 0,
      position: 0,
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );
  overview.ctr = overview.impressions > 0 ? overview.clicks / overview.impressions : 0;
  overview.position =
    topQueries.length > 0
      ? topQueries.reduce((sum, q) => sum + q.position * q.impressions, 0) / overview.impressions
      : 0;

  // 6. Categorize queries for actionable insights
  const branded = topQueries.filter((q) => isBranded(q.query));
  const nonBranded = topQueries.filter((q) => !isBranded(q.query));

  // Near-miss: position 8-20 with decent impressions (close to page 1 or top of page 2)
  const nearMiss = nonBranded
    .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 10)
    .sort((a, b) => a.position - b.position)
    .slice(0, 30);

  // Low-hanging fruit: already on page 1 (pos 1-10) but low CTR
  const lowHanging = nonBranded
    .filter((q) => q.position <= 10 && q.ctr < 0.05 && q.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);

  return {
    period: { start: startDate, end: endDate },
    overview,
    topQueries: topQueries.slice(0, 50),
    topPages: topPages.slice(0, 50),
    queryGroups: { branded, nonBranded: nonBranded.slice(0, 50), nearMiss, lowHanging },
    deviceBreakdown,
    countryBreakdown,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""))) {
  // If --list-sites flag, just show available sites and exit
  if (process.argv.includes("--list-sites")) {
    console.log("Sites accessible by this service account:");
    const sites = await listSites();
    if (sites.length === 0) {
      console.log("  (none found — make sure the service account email is added in GSC)");
    } else {
      sites.forEach((s: any) => console.log(`  ${s.siteUrl} [${s.permissionLevel}]`));
    }
    console.log(`\nYour .env has: GSC_SITE_URL=${siteUrl}`);
    process.exit(0);
  }

  const days = parseInt(process.argv[2] ?? "7", 10);
  console.log(`Fetching GSC data for last ${days} days (with 3-day lag)...`);
  try {
    const data = await fetchGSCData(days);
    const outPath = resolve(__dirname, `../data/gsc-${data.period.start}-to-${data.period.end}.json`);
    writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(`Written to ${outPath}`);
    console.log(`\nOverview:`);
    console.log(`  Clicks: ${data.overview.clicks}`);
    console.log(`  Impressions: ${data.overview.impressions}`);
    console.log(`  CTR: ${(data.overview.ctr * 100).toFixed(2)}%`);
    console.log(`  Avg Position: ${data.overview.position.toFixed(1)}`);
    console.log(`\nNear-miss queries (pos 8-20): ${data.queryGroups.nearMiss.length}`);
    console.log(`Low-hanging fruit (page 1, low CTR): ${data.queryGroups.lowHanging.length}`);
  } catch (err: any) {
    console.error(`\nError: ${err.message}`);
    console.log("\nListing sites accessible by this service account...");
    const sites = await listSites();
    if (sites.length === 0) {
      console.log("  No sites found. The service account may not have access yet.");
    } else {
      console.log("  Available sites:");
      sites.forEach((s: any) => console.log(`    ${s.siteUrl} [${s.permissionLevel}]`));
      console.log(`\n  Your .env has: GSC_SITE_URL=${siteUrl}`);
      console.log("  Update GSC_SITE_URL to match one of the above exactly.");
    }
  }
}
