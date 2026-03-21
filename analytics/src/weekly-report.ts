import { fetchGA4Data, type GA4Metrics } from "./ga4.js";
import { fetchGSCData, type GSCMetrics } from "./gsc.js";
import { loadExperiments, type Experiment } from "./experiment-tracker.js";
import {
  evaluateRunningExperiments,
  getExperimentTimeline,
  type EvaluationResult,
} from "./evaluate-experiments.js";
import { generateDashboardHTML } from "./generate-html.js";
import { config } from "dotenv";
import { format, subDays } from "date-fns";
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyReport {
  generatedAt: string;
  weekOf: string;
  ga4: GA4Metrics;
  gsc: GSCMetrics;
  experiments: {
    active: Experiment[];
    recentlyCompleted: Experiment[];
    evaluations: EvaluationResult[];
    timeline: Array<{
      id: string;
      name: string;
      startDate: string;
      minDuration: string;
      elapsedDays: number;
      daysRemaining: number;
      readyForEvaluation: boolean;
    }>;
  };
  previousWeek: {
    ga4Overview: GA4Metrics["overview"] | null;
    gscOverview: GSCMetrics["overview"] | null;
  };
  weekOverWeek: {
    sessions: { current: number; previous: number; change: number; pctChange: number } | null;
    users: { current: number; previous: number; change: number; pctChange: number } | null;
    pageviews: { current: number; previous: number; change: number; pctChange: number } | null;
    clicks: { current: number; previous: number; change: number; pctChange: number } | null;
    impressions: { current: number; previous: number; change: number; pctChange: number } | null;
    avgPosition: { current: number; previous: number; change: number; pctChange: number } | null;
  };
  insights: string[];
}

// ---------------------------------------------------------------------------
// Week-over-week comparison
// ---------------------------------------------------------------------------

function computeWoW(
  current: number,
  previous: number | undefined
): { current: number; previous: number; change: number; pctChange: number } | null {
  if (previous === undefined) return null;
  const change = current - previous;
  const pctChange = previous !== 0 ? (change / previous) * 100 : 0;
  return { current, previous, change, pctChange };
}

function loadPreviousReport(): WeeklyReport | null {
  const reportsDir = resolve(__dirname, "../reports");
  // Look for the most recent report that isn't today
  for (let i = 7; i <= 21; i++) {
    const d = subDays(new Date(), i);
    const date = format(d, "yyyy-MM-dd");
    const yyyy = format(d, "yyyy");
    const mm = format(d, "MM");

    // Check new nested path first, then flat (backwards compat)
    const nestedPath = resolve(reportsDir, yyyy, mm, `weekly-${date}.json`);
    const flatPath = resolve(reportsDir, `weekly-${date}.json`);

    if (existsSync(nestedPath)) {
      return JSON.parse(readFileSync(nestedPath, "utf-8"));
    }
    if (existsSync(flatPath)) {
      return JSON.parse(readFileSync(flatPath, "utf-8"));
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auto-insights
// ---------------------------------------------------------------------------

function generateInsights(ga4: GA4Metrics, gsc: GSCMetrics, wow: WeeklyReport["weekOverWeek"]): string[] {
  const insights: string[] = [];

  // Traffic changes
  if (wow.sessions && Math.abs(wow.sessions.pctChange) > 10) {
    const dir = wow.sessions.pctChange > 0 ? "up" : "down";
    insights.push(
      `Sessions ${dir} ${Math.abs(wow.sessions.pctChange).toFixed(1)}% WoW (${wow.sessions.previous} → ${wow.sessions.current})`
    );
  }

  // Search performance
  if (wow.clicks && Math.abs(wow.clicks.pctChange) > 10) {
    const dir = wow.clicks.pctChange > 0 ? "up" : "down";
    insights.push(
      `GSC clicks ${dir} ${Math.abs(wow.clicks.pctChange).toFixed(1)}% WoW (${wow.clicks.previous} → ${wow.clicks.current})`
    );
  }

  // Near-miss opportunities
  if (gsc.queryGroups.nearMiss.length > 0) {
    const top3 = gsc.queryGroups.nearMiss.slice(0, 3);
    insights.push(
      `${gsc.queryGroups.nearMiss.length} near-miss queries (pos 8-20) — top opportunities: ${top3.map((q) => `"${q.query}" (pos ${q.position.toFixed(1)})`).join(", ")}`
    );
  }

  // Low-hanging fruit
  if (gsc.queryGroups.lowHanging.length > 0) {
    const top3 = gsc.queryGroups.lowHanging.slice(0, 3);
    insights.push(
      `${gsc.queryGroups.lowHanging.length} low-CTR queries on page 1 — consider title/description improvements for: ${top3.map((q) => `"${q.query}" (${(q.ctr * 100).toFixed(1)}% CTR, pos ${q.position.toFixed(1)})`).join(", ")}`
    );
  }

  // High bounce pages
  const highBouncePages = ga4.topPages
    .filter((p) => p.bounceRate > 0.7 && p.pageviews > 20)
    .slice(0, 3);
  if (highBouncePages.length > 0) {
    insights.push(
      `High-bounce pages to investigate: ${highBouncePages.map((p) => `${p.path} (${(p.bounceRate * 100).toFixed(0)}% bounce, ${p.pageviews} views)`).join(", ")}`
    );
  }

  // Device split insight
  const mobileShare = ga4.deviceBreakdown.find((d) => d.category === "mobile");
  if (mobileShare) {
    const totalSessions = ga4.deviceBreakdown.reduce((s, d) => s + d.sessions, 0);
    const mobilePct = (mobileShare.sessions / totalSessions) * 100;
    if (mobilePct > 60) {
      insights.push(`Mobile-heavy traffic (${mobilePct.toFixed(0)}%) — prioritize mobile UX`);
    }
  }

  // Top growing pages (compare topPages if previous data available)
  if (ga4.topPages.length > 0) {
    const topPage = ga4.topPages[0];
    insights.push(`Top page: ${topPage.path} with ${topPage.pageviews} pageviews and ${topPage.users} users`);
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Main report generation
// ---------------------------------------------------------------------------

export async function generateWeeklyReport(): Promise<WeeklyReport> {
  console.log("Fetching GA4 data...");
  const ga4 = await fetchGA4Data(7);

  console.log("Fetching GSC data...");
  const gsc = await fetchGSCData(7);

  console.log("Loading experiments...");
  const allExperiments = loadExperiments();
  const active = allExperiments.filter((e) => e.status === "running");
  const recentlyCompleted = allExperiments
    .filter((e) => e.status === "completed" || e.status === "winner" || e.status === "loser" || e.status === "inconclusive")
    .slice(0, 5);

  console.log("Evaluating running experiments...");
  const evaluations = evaluateRunningExperiments(gsc, ga4);
  const timeline = getExperimentTimeline();

  if (evaluations.length > 0) {
    console.log(`  ${evaluations.length} experiment(s) ready for evaluation!`);
    evaluations.forEach((ev) => {
      console.log(`    → ${ev.experimentName}: ${ev.status.toUpperCase()} (${ev.summary})`);
    });
  } else if (timeline.length > 0) {
    timeline.forEach((t) => {
      if (t.daysRemaining > 0) {
        console.log(`  ${t.name}: ${t.daysRemaining} days remaining before evaluation`);
      }
    });
  }

  console.log("Loading previous report for WoW comparison...");
  const prev = loadPreviousReport();

  const weekOverWeek = {
    sessions: computeWoW(ga4.overview.sessions, prev?.ga4.overview.sessions),
    users: computeWoW(ga4.overview.totalUsers, prev?.ga4.overview.totalUsers),
    pageviews: computeWoW(ga4.overview.pageviews, prev?.ga4.overview.pageviews),
    clicks: computeWoW(gsc.overview.clicks, prev?.gsc.overview.clicks),
    impressions: computeWoW(gsc.overview.impressions, prev?.gsc.overview.impressions),
    avgPosition: computeWoW(gsc.overview.position, prev?.gsc.overview.position),
  };

  const insights = generateInsights(ga4, gsc, weekOverWeek);

  // Add experiment evaluation insights
  for (const ev of evaluations) {
    insights.push(
      `🧪 Experiment "${ev.experimentName}" is ready for evaluation after ${ev.durationWeeks} weeks — ` +
      `verdict: ${ev.status.toUpperCase()}. ${ev.summary}`
    );
  }
  for (const t of timeline) {
    if (t.daysRemaining > 0) {
      insights.push(
        `⏳ Experiment "${t.name}" has ${t.daysRemaining} days remaining (${t.elapsedDays} of ${t.minDuration} elapsed)`
      );
    }
  }

  const report: WeeklyReport = {
    generatedAt: new Date().toISOString(),
    weekOf: format(new Date(), "yyyy-MM-dd"),
    ga4,
    gsc,
    experiments: { active, recentlyCompleted, evaluations, timeline },
    previousWeek: {
      ga4Overview: prev?.ga4.overview ?? null,
      gscOverview: prev?.gsc.overview ?? null,
    },
    weekOverWeek,
    insights,
  };

  return report;
}

// ---------------------------------------------------------------------------
// Report Index Generator
// ---------------------------------------------------------------------------

function generateReportIndex(): void {
  const reportsDir = resolve(__dirname, "../reports");
  const reports: Array<{ date: string; path: string }> = [];

  // Scan nested YYYY/MM dirs
  const years = readdirSync(reportsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();

  for (const year of years) {
    const months = readdirSync(join(reportsDir, year), { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d{2}$/.test(d.name))
      .map((d) => d.name)
      .sort()
      .reverse();
    for (const month of months) {
      const files = readdirSync(join(reportsDir, year, month))
        .filter((f) => f.endsWith(".html"))
        .sort()
        .reverse();
      for (const file of files) {
        const dateMatch = file.match(/weekly-(\d{4}-\d{2}-\d{2})\.html/);
        if (dateMatch) {
          reports.push({ date: dateMatch[1], path: `${year}/${month}/${file}` });
        }
      }
    }
  }

  // Also check for legacy flat reports
  const flatFiles = readdirSync(reportsDir)
    .filter((f) => f.endsWith(".html") && f !== "index.html")
    .sort()
    .reverse();
  for (const file of flatFiles) {
    const dateMatch = file.match(/weekly-(\d{4}-\d{2}-\d{2})\.html/);
    if (dateMatch && !reports.find((r) => r.date === dateMatch[1])) {
      reports.push({ date: dateMatch[1], path: file });
    }
  }

  // Sort all by date descending
  reports.sort((a, b) => b.date.localeCompare(a.date));

  // Group by month for display
  const grouped = new Map<string, typeof reports>();
  for (const r of reports) {
    const monthKey = r.date.slice(0, 7); // "2026-03"
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey)!.push(r);
  }

  const monthSections = Array.from(grouped.entries())
    .map(([monthKey, items]) => {
      const [y, m] = monthKey.split("-");
      const monthName = new Date(Number(y), Number(m) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
      const links = items
        .map((r) => {
          const d = new Date(r.date + "T00:00:00");
          const label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
          return `        <a href="${r.path}" class="report-link">
          <span class="report-date">${label}</span>
          <span class="report-file">${r.path}</span>
        </a>`;
        })
        .join("\n");
      return `      <div class="month-group">
        <h3>${monthName}</h3>
${links}
      </div>`;
    })
    .join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BowlingAlleys.io — Weekly Reports</title>
  <style>
    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --border: #2d3140;
      --text: #e4e6ef;
      --text-dim: #8b8fa3;
      --accent: #6366f1;
      --accent-light: #818cf8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    header h1 { font-size: 1.5rem; color: var(--accent-light); }
    header p { color: var(--text-dim); font-size: 0.9rem; margin-top: 0.25rem; }
    .month-group { margin-bottom: 2rem; }
    .month-group h3 {
      font-size: 0.85rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    .report-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 0.5rem;
      text-decoration: none;
      color: var(--text);
      transition: border-color 0.15s, background 0.15s;
    }
    .report-link:hover {
      border-color: var(--accent);
      background: #1e2235;
    }
    .report-date { font-weight: 500; }
    .report-file { color: var(--text-dim); font-size: 0.8rem; font-family: monospace; }
    .empty { color: var(--text-dim); font-style: italic; padding: 2rem; text-align: center; }
    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-dim);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>BowlingAlleys.io Weekly Reports</h1>
      <p>${reports.length} report${reports.length !== 1 ? "s" : ""} generated</p>
    </header>
${monthSections || '    <div class="empty">No reports yet. Run <code>npm run report</code> to generate your first one.</div>'}
    <footer>BowlingAlleys.io Analytics Pipeline</footer>
  </div>
</body>
</html>`;

  writeFileSync(resolve(reportsDir, "index.html"), indexHtml);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""))) {
  const report = await generateWeeklyReport();

  // Build nested output dir: reports/YYYY/MM/
  const d = new Date();
  const yyyy = format(d, "yyyy");
  const mm = format(d, "MM");
  const weekDir = resolve(__dirname, "../reports", yyyy, mm);
  mkdirSync(weekDir, { recursive: true });

  // Write JSON
  const jsonPath = resolve(weekDir, `weekly-${report.weekOf}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // Generate HTML dashboard
  const htmlPath = resolve(weekDir, `weekly-${report.weekOf}.html`);
  const html = generateDashboardHTML(report);
  writeFileSync(htmlPath, html);

  // Regenerate index page
  generateReportIndex();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`WEEKLY REPORT — ${report.weekOf}`);
  console.log(`${"=".repeat(60)}\n`);

  console.log("GA4 Overview:");
  console.log(`  Sessions:        ${report.ga4.overview.sessions}`);
  console.log(`  Users:           ${report.ga4.overview.totalUsers} (${report.ga4.overview.newUsers} new)`);
  console.log(`  Pageviews:       ${report.ga4.overview.pageviews}`);
  console.log(`  Engagement Rate: ${(report.ga4.overview.engagementRate * 100).toFixed(1)}%`);
  console.log(`  Bounce Rate:     ${(report.ga4.overview.bounceRate * 100).toFixed(1)}%`);

  console.log("\nGSC Overview:");
  console.log(`  Clicks:      ${report.gsc.overview.clicks}`);
  console.log(`  Impressions: ${report.gsc.overview.impressions}`);
  console.log(`  CTR:         ${(report.gsc.overview.ctr * 100).toFixed(2)}%`);
  console.log(`  Avg Position: ${report.gsc.overview.position.toFixed(1)}`);

  if (Object.values(report.weekOverWeek).some((v) => v !== null)) {
    console.log("\nWeek-over-Week:");
    for (const [key, val] of Object.entries(report.weekOverWeek)) {
      if (val) {
        const arrow = val.pctChange >= 0 ? "↑" : "↓";
        console.log(`  ${key}: ${val.previous} → ${val.current} (${arrow} ${Math.abs(val.pctChange).toFixed(1)}%)`);
      }
    }
  }

  const topVenuePages = report.ga4.topPages
    .filter((p) => p.path.startsWith("/venue/"))
    .slice(0, 16);

  console.log("\nTop Venue Pages This Week:");
  if (topVenuePages.length === 0) {
    console.log("  No venue pages tracked this week.");
  } else {
    topVenuePages.forEach((v, i) => {
      console.log(`  ${String(i + 1).padStart(2, "0")}. ${v.path} — ${v.pageviews} pageviews, ${v.users} users`);
    });
  }

  console.log("\nInsights:");
  report.insights.forEach((insight, i) => console.log(`  ${i + 1}. ${insight}`));

  console.log(`\nActive experiments: ${report.experiments.active.length}`);
  report.experiments.active.forEach((e) => console.log(`  - ${e.name} (started ${e.startDate})`));

  if (report.experiments.evaluations.length > 0) {
    console.log("\n🧪 EXPERIMENT EVALUATIONS:");
    report.experiments.evaluations.forEach((ev) => {
      console.log(`  [${ev.status.toUpperCase()}] ${ev.experimentName}`);
      console.log(`    ${ev.summary}`);
      console.log(`    Recommendation: ${ev.recommendation}`);
      console.log("    Metric changes:");
      ev.metricChanges.forEach((m) => {
        const arrow = m.improved ? "↑" : "↓";
        console.log(`      ${m.metric}: ${m.baseline} → ${m.current} (${arrow} ${Math.abs(m.changePct).toFixed(1)}%)`);
      });
    });
    console.log("\n  ⚠️  To apply these results, the Sunday task will ask for your approval.");
  }

  if (report.experiments.timeline.length > 0) {
    console.log("\nExperiment timeline:");
    report.experiments.timeline.forEach((t) => {
      const status = t.readyForEvaluation ? "✅ READY" : `⏳ ${t.daysRemaining}d left`;
      console.log(`  ${t.name}: ${status} (${t.elapsedDays}d / ${t.minDuration})`);
    });
  }

  console.log(`\nOutputs:`);
  console.log(`  JSON:  ${jsonPath}`);
  console.log(`  HTML:  ${htmlPath}`);
  console.log(`  Index: ${resolve(__dirname, "../reports/index.html")}`);
}
