import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "dotenv";
import { subDays, format } from "date-fns";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../.env") });

const propertyId = process.env.GA4_PROPERTY_ID;
if (!propertyId) throw new Error("GA4_PROPERTY_ID is required in .env");

const client = new BetaAnalyticsDataClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GA4Metrics {
  period: { start: string; end: string };
  overview: {
    sessions: number;
    totalUsers: number;
    newUsers: number;
    pageviews: number;
    avgSessionDuration: number;
    bounceRate: number;
    engagementRate: number;
    eventsPerSession: number;
  };
  topPages: Array<{
    path: string;
    pageviews: number;
    users: number;
    avgEngagementTime: number;
    bounceRate: number;
  }>;
  topSources: Array<{
    source: string;
    medium: string;
    sessions: number;
    users: number;
    bounceRate: number;
  }>;
  topEvents: Array<{
    eventName: string;
    eventCount: number;
    users: number;
  }>;
  deviceBreakdown: Array<{
    category: string;
    sessions: number;
    users: number;
  }>;
  topCities: Array<{
    city: string;
    sessions: number;
    users: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowVal(row: any, idx: number): string {
  return row.dimensionValues?.[idx]?.value ?? "";
}

function rowMetric(row: any, idx: number): number {
  return parseFloat(row.metricValues?.[idx]?.value ?? "0");
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

export async function fetchGA4Data(
  daysBack: number = 7
): Promise<GA4Metrics> {
  const startDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");
  const endDate = format(subDays(new Date(), 1), "yyyy-MM-dd");

  // 1. Overview metrics
  const [overviewRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
      { name: "engagementRate" },
      { name: "eventsPerSession" },
    ],
  });

  const ov = overviewRes.rows?.[0];
  const overview = {
    sessions: rowMetric(ov, 0),
    totalUsers: rowMetric(ov, 1),
    newUsers: rowMetric(ov, 2),
    pageviews: rowMetric(ov, 3),
    avgSessionDuration: rowMetric(ov, 4),
    bounceRate: rowMetric(ov, 5),
    engagementRate: rowMetric(ov, 6),
    eventsPerSession: rowMetric(ov, 7),
  };

  // 2. Top pages
  const [pagesRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "totalUsers" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 30,
  });

  const topPages = (pagesRes.rows ?? []).map((row) => ({
    path: rowVal(row, 0),
    pageviews: rowMetric(row, 0),
    users: rowMetric(row, 1),
    avgEngagementTime: rowMetric(row, 2),
    bounceRate: rowMetric(row, 3),
  }));

  // 3. Top traffic sources
  const [sourcesRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "bounceRate" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  });

  const topSources = (sourcesRes.rows ?? []).map((row) => ({
    source: rowVal(row, 0),
    medium: rowVal(row, 1),
    sessions: rowMetric(row, 0),
    users: rowMetric(row, 1),
    bounceRate: rowMetric(row, 2),
  }));

  // 4. Top events
  const [eventsRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [
      { name: "eventCount" },
      { name: "totalUsers" },
    ],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 20,
  });

  const topEvents = (eventsRes.rows ?? []).map((row) => ({
    eventName: rowVal(row, 0),
    eventCount: rowMetric(row, 0),
    users: rowMetric(row, 1),
  }));

  // 5. Device breakdown
  const [devicesRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  const deviceBreakdown = (devicesRes.rows ?? []).map((row) => ({
    category: rowVal(row, 0),
    sessions: rowMetric(row, 0),
    users: rowMetric(row, 1),
  }));

  // 6. Top cities
  const [citiesRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "city" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  });

  const topCities = (citiesRes.rows ?? []).map((row) => ({
    city: rowVal(row, 0),
    sessions: rowMetric(row, 0),
    users: rowMetric(row, 1),
  }));

  return {
    period: { start: startDate, end: endDate },
    overview,
    topPages,
    topSources,
    topEvents,
    deviceBreakdown,
    topCities,
  };
}

// ---------------------------------------------------------------------------
// CLI: run standalone to dump GA4 data
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""))) {
  const days = parseInt(process.argv[2] ?? "7", 10);
  console.log(`Fetching GA4 data for last ${days} days...`);
  const data = await fetchGA4Data(days);
  const outPath = resolve(__dirname, `../data/ga4-${data.period.start}-to-${data.period.end}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Written to ${outPath}`);
  console.log(`\nOverview:`);
  console.log(`  Sessions: ${data.overview.sessions}`);
  console.log(`  Users: ${data.overview.totalUsers} (${data.overview.newUsers} new)`);
  console.log(`  Pageviews: ${data.overview.pageviews}`);
  console.log(`  Bounce Rate: ${(data.overview.bounceRate * 100).toFixed(1)}%`);
  console.log(`  Engagement Rate: ${(data.overview.engagementRate * 100).toFixed(1)}%`);
}
