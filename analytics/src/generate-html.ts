// HTML Dashboard Generator
// Reads a weekly report JSON and outputs a styled HTML dashboard

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { WeeklyReport } from "./weekly-report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function wowBadge(
  wow: { current: number; previous: number; change: number; pctChange: number } | null,
  invertColor = false
): string {
  if (!wow) return '<span class="badge neutral">No prev data</span>';
  const isUp = wow.pctChange >= 0;
  // For position, lower is better so invert the color
  const isGood = invertColor ? !isUp : isUp;
  const arrow = isUp ? "↑" : "↓";
  const cls = isGood ? "good" : "bad";
  return `<span class="badge ${cls}">${arrow} ${Math.abs(wow.pctChange).toFixed(1)}%</span>`;
}

function formatMetricValue(v: unknown): string {
  if (typeof v === "number") {
    if (v > 0 && v < 1) return pct(v);
    return fmt(v);
  }
  return String(v);
}

function buildBaselineTable(metrics: Record<string, unknown>): string {
  // Try to group metrics by page/entity prefix (e.g. "how_to_aim_clicks" → group "how to aim")
  const entries = Object.entries(metrics);

  // Detect grouped pattern: keys ending in _clicks, _impressions, _ctr, _avg_ctr
  const suffixMap: Array<[string, string]> = [
    ["_avg_ctr", "ctr"],
    ["_clicks", "clicks"],
    ["_impressions", "impressions"],
    ["_ctr", "ctr"],
  ];
  const grouped = new Map<string, Record<string, unknown>>();
  const ungrouped: Array<[string, unknown]> = [];

  for (const [key, val] of entries) {
    const match = suffixMap.find(([s]) => key.endsWith(s));
    if (match) {
      const [suffix, col] = match;
      const prefix = key.slice(0, -suffix.length).replace(/_/g, " ");
      if (!grouped.has(prefix)) grouped.set(prefix, {});
      grouped.get(prefix)![col] = val;
    } else {
      ungrouped.push([key, val]);
    }
  }

  // Merge partial-prefix groups: if "blog" and "blog total" both exist, merge "blog" into "blog total"
  const prefixes = Array.from(grouped.keys());
  for (const short of prefixes) {
    const longer = prefixes.find((p) => p !== short && p.startsWith(short + " "));
    if (longer && grouped.has(short)) {
      const shortVals = grouped.get(short)!;
      const longerVals = grouped.get(longer)!;
      for (const [k, v] of Object.entries(shortVals)) {
        if (!(k in longerVals)) longerVals[k] = v;
      }
      grouped.delete(short);
    }
  }

  // If we found grouped metrics, render a multi-column table
  if (grouped.size > 0) {
    const groupEntries = Array.from(grouped.entries());
    const rows = groupEntries
      .map(
        ([name, vals], i) =>
          `<tr${i === 0 ? ' class="baseline-summary"' : ""}><td class="baseline-label">${name}</td><td>${formatMetricValue(vals.clicks ?? "—")}</td><td>${formatMetricValue(vals.impressions ?? "—")}</td><td>${formatMetricValue(vals.ctr ?? "—")}</td></tr>`
      )
      .join("");
    return `<table class="baseline-table">
      <thead><tr><th>Page</th><th>Clicks</th><th>Impr</th><th>CTR</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // Fallback: simple key/value table
  const rows = entries
    .map(([k, v]) => `<tr><td>${k.replace(/_/g, " ")}</td><td>${formatMetricValue(v)}</td></tr>`)
    .join("");
  return `<table class="baseline-table">
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// HTML Generation
// ---------------------------------------------------------------------------

export function generateDashboardHTML(report: WeeklyReport): string {
  const { ga4, gsc, experiments, weekOverWeek: wow, insights } = report;

  // Build top pages table rows (GA4)
  const ga4TopPagesRows = ga4.topPages
    .slice(0, 15)
    .map(
      (p) => `
      <tr>
        <td class="page-path">${escapeHtml(p.path)}</td>
        <td>${fmt(p.pageviews)}</td>
        <td>${fmt(p.users)}</td>
        <td>${pct(p.bounceRate)}</td>
        <td>${p.avgEngagementTime.toFixed(0)}s</td>
      </tr>`
    )
    .join("");

  // Build GSC top queries rows
  const gscTopQueryRows = gsc.topQueries
    .slice(0, 15)
    .map(
      (q) => `
      <tr>
        <td class="query-text">${escapeHtml(q.query)}</td>
        <td>${fmt(q.clicks)}</td>
        <td>${fmt(q.impressions)}</td>
        <td>${pct(q.ctr)}</td>
        <td>${q.position.toFixed(1)}</td>
      </tr>`
    )
    .join("");

  // Build GSC top pages rows
  const gscTopPageRows = gsc.topPages
    .slice(0, 15)
    .map(
      (p) => `
      <tr>
        <td class="page-path">${escapeHtml(p.page)}</td>
        <td>${fmt(p.clicks)}</td>
        <td>${fmt(p.impressions)}</td>
        <td>${pct(p.ctr)}</td>
        <td>${p.position.toFixed(1)}</td>
      </tr>`
    )
    .join("");

  // Near-miss queries
  const nearMissRows = gsc.queryGroups.nearMiss
    .slice(0, 10)
    .map(
      (q) => `
      <tr>
        <td class="query-text">${escapeHtml(q.query)}</td>
        <td>${fmt(q.clicks)}</td>
        <td>${fmt(q.impressions)}</td>
        <td>${pct(q.ctr)}</td>
        <td>${q.position.toFixed(1)}</td>
      </tr>`
    )
    .join("");

  // Low-hanging fruit queries
  const lowHangingRows = gsc.queryGroups.lowHanging
    .slice(0, 10)
    .map(
      (q) => `
      <tr>
        <td class="query-text">${escapeHtml(q.query)}</td>
        <td>${fmt(q.clicks)}</td>
        <td>${fmt(q.impressions)}</td>
        <td>${pct(q.ctr)}</td>
        <td>${q.position.toFixed(1)}</td>
      </tr>`
    )
    .join("");

  // Traffic sources for chart
  const trafficSourceLabels = JSON.stringify(ga4.topSources.map((s) => s.source));
  const trafficSourceData = JSON.stringify(ga4.topSources.map((s) => s.sessions));

  // Device breakdown for chart
  const deviceLabels = JSON.stringify(ga4.deviceBreakdown.map((d) => d.category));
  const deviceData = JSON.stringify(ga4.deviceBreakdown.map((d) => d.sessions));

  // Top cities
  const cityRows = ga4.topCities
    .slice(0, 10)
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.city)}</td>
        <td>${fmt(c.sessions)}</td>
        <td>${fmt(c.users)}</td>
      </tr>`
    )
    .join("");

  // Custom events
  const eventRows = ga4.topEvents
    .slice(0, 10)
    .map(
      (e) => `
      <tr>
        <td>${escapeHtml(e.eventName)}</td>
        <td>${fmt(e.eventCount)}</td>
      </tr>`
    )
    .join("");

  // Experiments section
  const activeExperimentCards = experiments.active
    .map(
      (exp) => `
      <div class="experiment-card running">
        <div class="exp-header">
          <span class="exp-status running">RUNNING</span>
          <span class="exp-name">${escapeHtml(exp.name)}</span>
        </div>
        <p class="exp-hypothesis">${escapeHtml(exp.hypothesis)}</p>
        <div class="exp-meta">
          <span>Started: ${exp.startDate ?? "—"}</span>
          <span>Primary metric: ${escapeHtml(exp.primaryMetric)}</span>
          <span>Min duration: ${exp.minDuration ?? "—"}</span>
        </div>
        ${
          exp.baselineSnapshot
            ? `<div class="exp-baseline">
            <strong>Baseline (${exp.baselineSnapshot.date}):</strong>
            ${buildBaselineTable(exp.baselineSnapshot.metrics)}
          </div>`
            : ""
        }
      </div>`
    )
    .join("");

  const completedExperimentCards = experiments.recentlyCompleted
    .map(
      (exp) => `
      <div class="experiment-card ${exp.status}">
        <div class="exp-header">
          <span class="exp-status ${exp.status}">${exp.status.toUpperCase()}</span>
          <span class="exp-name">${escapeHtml(exp.name)}</span>
        </div>
        <p class="exp-hypothesis">${escapeHtml(exp.hypothesis)}</p>
        ${exp.result ? `<p class="exp-result">${escapeHtml(exp.result)}</p>` : ""}
        ${exp.learnings ? `<p class="exp-learnings"><strong>Learnings:</strong> ${escapeHtml(exp.learnings)}</p>` : ""}
      </div>`
    )
    .join("");

  // Evaluation cards (experiments ready for verdict)
  const evaluationCards = (experiments.evaluations ?? [])
    .map(
      (ev) => `
      <div class="experiment-card evaluation ${ev.status}">
        <div class="exp-header">
          <span class="exp-status ${ev.status}">EVALUATION: ${ev.status.toUpperCase()}</span>
          <span class="exp-name">${escapeHtml(ev.experimentName)}</span>
        </div>
        <p class="exp-result">${escapeHtml(ev.summary)}</p>
        <p class="exp-learnings"><strong>Recommendation:</strong> ${escapeHtml(ev.recommendation)}</p>
        <table class="baseline-table" style="margin-top:0.75rem">
          <thead><tr><th>Metric</th><th>Baseline</th><th>Current</th><th>Change</th></tr></thead>
          <tbody>${ev.metricChanges
            .map(
              (m) => {
                const arrow = m.improved ? "↑" : "↓";
                const cls = m.improved ? "good" : "bad";
                const label = m.metric.replace(/_/g, " ");
                const baseStr = m.baseline > 0 && m.baseline < 1 ? pct(m.baseline) : fmt(m.baseline);
                const curStr = m.current > 0 && m.current < 1 ? pct(m.current) : fmt(m.current);
                return `<tr><td>${label}</td><td>${baseStr}</td><td>${curStr}</td><td><span class="badge ${cls}">${arrow} ${Math.abs(m.changePct).toFixed(1)}%</span></td></tr>`;
              }
            )
            .join("")}
          </tbody>
        </table>
        <p style="margin-top:0.75rem;font-size:0.8rem;color:var(--yellow);">⚠️ Awaiting human approval to finalize.</p>
      </div>`
    )
    .join("");

  // Timeline (countdown for running experiments)
  const timelineHtml = (experiments.timeline ?? [])
    .map(
      (t) => {
        const pctDone = t.elapsedDays / (t.elapsedDays + t.daysRemaining);
        const barWidth = Math.min(100, Math.round(pctDone * 100));
        const statusLabel = t.readyForEvaluation
          ? '<span class="badge good">Ready for evaluation</span>'
          : `<span class="badge neutral">${t.daysRemaining}d remaining</span>`;
        return `
        <div class="timeline-item">
          <div class="timeline-header">
            <span class="timeline-name">${escapeHtml(t.name)}</span>
            ${statusLabel}
          </div>
          <div class="timeline-bar-bg">
            <div class="timeline-bar-fill" style="width:${barWidth}%"></div>
          </div>
          <div class="timeline-meta">${t.elapsedDays}d elapsed of ${t.minDuration} (started ${t.startDate})</div>
        </div>`;
      }
    )
    .join("");

  // Insights list
  const insightItems = insights.map((i) => `<li>${escapeHtml(i)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BowlingAlleys.io — Weekly Dashboard (${report.weekOf})</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.7/chart.umd.min.js"></script>
  <style>
    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface2: #232733;
      --border: #2d3140;
      --text: #e4e6ef;
      --text-dim: #8b8fa3;
      --accent: #6366f1;
      --accent-light: #818cf8;
      --green: #22c55e;
      --red: #ef4444;
      --yellow: #eab308;
      --orange: #f97316;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container { max-width: 1400px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    header h1 { font-size: 1.5rem; color: var(--accent-light); }
    header .date { color: var(--text-dim); font-size: 0.9rem; }

    .section-title {
      font-size: 1.1rem;
      color: var(--accent-light);
      margin: 2rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }

    .kpi-card .label { color: var(--text-dim); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-card .value { font-size: 1.75rem; font-weight: 700; margin: 0.25rem 0; }
    .kpi-card .sub { color: var(--text-dim); font-size: 0.8rem; }

    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    .badge.good { background: rgba(34,197,94,0.15); color: var(--green); }
    .badge.bad { background: rgba(239,68,68,0.15); color: var(--red); }
    .badge.neutral { background: rgba(139,143,163,0.15); color: var(--text-dim); }

    /* Insights */
    .insights-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
    }
    .insights-box ul { list-style: none; }
    .insights-box li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    .insights-box li:last-child { border-bottom: none; }
    .insights-box li::before { content: "💡 "; }

    /* Charts */
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }

    .chart-card h3 { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 1rem; }

    /* Tables */
    .table-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }

    .table-card h3 { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 0.75rem; }

    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; color: var(--text-dim); padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: var(--surface2); }

    .page-path, .query-text { max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Two-col layout for tables */
    .two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 1.5rem;
    }

    /* Experiments */
    .experiment-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }

    .exp-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .exp-status {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .exp-status.running { background: rgba(99,102,241,0.2); color: var(--accent-light); }
    .exp-status.completed { background: rgba(34,197,94,0.2); color: var(--green); }
    .exp-status.winner { background: rgba(34,197,94,0.2); color: var(--green); }
    .exp-status.loser { background: rgba(239,68,68,0.2); color: var(--red); }

    .exp-name { font-weight: 600; font-size: 1rem; }
    .exp-hypothesis { color: var(--text-dim); font-size: 0.85rem; margin-bottom: 0.75rem; }
    .exp-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--text-dim); }
    .exp-baseline { margin-top: 0.75rem; font-size: 0.8rem; }
    .baseline-table {
      margin-top: 0.5rem;
      width: 100%;
      max-width: 600px;
      font-size: 0.8rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .baseline-table th {
      font-size: 0.7rem;
      padding: 0.4rem 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      background: var(--surface2);
    }
    .baseline-table td {
      padding: 0.35rem 0.75rem;
      color: var(--text-dim);
      font-variant-numeric: tabular-nums;
    }
    .baseline-table .baseline-label,
    .baseline-table td:first-child {
      text-transform: capitalize;
      color: var(--text);
      font-weight: 500;
    }
    .baseline-table .baseline-summary td {
      font-weight: 600;
      color: var(--text);
      border-bottom: 2px solid var(--border);
    }
    .exp-result { color: var(--green); font-size: 0.85rem; margin-bottom: 0.5rem; }
    .exp-learnings { color: var(--text-dim); font-size: 0.85rem; }

    /* Evaluation cards */
    .experiment-card.evaluation { border-color: var(--yellow); border-width: 2px; }
    .experiment-card.evaluation.winner { border-color: var(--green); }
    .experiment-card.evaluation.loser { border-color: var(--red); }

    /* Timeline */
    .timeline-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .timeline-name { font-weight: 500; font-size: 0.9rem; }
    .timeline-bar-bg {
      height: 6px;
      background: var(--surface2);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.4rem;
    }
    .timeline-bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .timeline-meta { font-size: 0.75rem; color: var(--text-dim); }

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
      <h1>BowlingAlleys.io Weekly Dashboard</h1>
      <div class="date">Week of ${report.weekOf} &middot; Generated ${new Date(report.generatedAt).toLocaleString()}</div>
    </header>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Sessions</div>
        <div class="value">${fmt(ga4.overview.sessions)} ${wowBadge(wow.sessions)}</div>
        <div class="sub">${fmt(ga4.overview.totalUsers)} users (${fmt(ga4.overview.newUsers)} new)</div>
      </div>
      <div class="kpi-card">
        <div class="label">Pageviews</div>
        <div class="value">${fmt(ga4.overview.pageviews)} ${wowBadge(wow.pageviews)}</div>
        <div class="sub">${ga4.overview.eventsPerSession.toFixed(1)} events/session</div>
      </div>
      <div class="kpi-card">
        <div class="label">Bounce Rate</div>
        <div class="value">${pct(ga4.overview.bounceRate)}</div>
        <div class="sub">Engagement: ${pct(ga4.overview.engagementRate)}</div>
      </div>
      <div class="kpi-card">
        <div class="label">GSC Clicks</div>
        <div class="value">${fmt(gsc.overview.clicks)} ${wowBadge(wow.clicks)}</div>
        <div class="sub">CTR: ${pct(gsc.overview.ctr)}</div>
      </div>
      <div class="kpi-card">
        <div class="label">GSC Impressions</div>
        <div class="value">${fmt(gsc.overview.impressions)} ${wowBadge(wow.impressions)}</div>
        <div class="sub">Avg position: ${gsc.overview.position.toFixed(1)} ${wowBadge(wow.avgPosition, true)}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Avg Session Duration</div>
        <div class="value">${ga4.overview.avgSessionDuration.toFixed(0)}s</div>
        <div class="sub">${(ga4.overview.avgSessionDuration / 60).toFixed(1)} minutes</div>
      </div>
    </div>

    <!-- Insights -->
    <h2 class="section-title">Key Insights</h2>
    <div class="insights-box">
      <ul>${insightItems || "<li>No automated insights this week</li>"}</ul>
    </div>

    <!-- Charts -->
    <h2 class="section-title">Traffic Breakdown</h2>
    <div class="chart-grid">
      <div class="chart-card">
        <h3>Traffic Sources</h3>
        <canvas id="trafficChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Device Breakdown</h3>
        <canvas id="deviceChart"></canvas>
      </div>
    </div>

    <!-- GA4 Top Pages -->
    <h2 class="section-title">Top Pages (GA4)</h2>
    <div class="table-card">
      <table>
        <thead><tr><th>Page</th><th>Views</th><th>Users</th><th>Bounce</th><th>Eng Time</th></tr></thead>
        <tbody>${ga4TopPagesRows}</tbody>
      </table>
    </div>

    <!-- GSC Tables -->
    <h2 class="section-title">Search Console</h2>
    <div class="two-col">
      <div class="table-card">
        <h3>Top Queries</h3>
        <table>
          <thead><tr><th>Query</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr></thead>
          <tbody>${gscTopQueryRows}</tbody>
        </table>
      </div>
      <div class="table-card">
        <h3>Top Pages (GSC)</h3>
        <table>
          <thead><tr><th>Page</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr></thead>
          <tbody>${gscTopPageRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Opportunities -->
    <h2 class="section-title">SEO Opportunities</h2>
    <div class="two-col">
      <div class="table-card">
        <h3>Near-Miss Queries (Position 8-20)</h3>
        <table>
          <thead><tr><th>Query</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr></thead>
          <tbody>${nearMissRows || '<tr><td colspan="5" style="color:var(--text-dim)">No near-miss queries this week</td></tr>'}</tbody>
        </table>
      </div>
      <div class="table-card">
        <h3>Low-Hanging Fruit (Page 1, Low CTR)</h3>
        <table>
          <thead><tr><th>Query</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr></thead>
          <tbody>${lowHangingRows || '<tr><td colspan="5" style="color:var(--text-dim)">No low-CTR page 1 queries this week</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <!-- Cities & Events -->
    <h2 class="section-title">Geography & Events</h2>
    <div class="two-col">
      <div class="table-card">
        <h3>Top Cities</h3>
        <table>
          <thead><tr><th>City</th><th>Sessions</th><th>Users</th></tr></thead>
          <tbody>${cityRows}</tbody>
        </table>
      </div>
      <div class="table-card">
        <h3>Custom Events</h3>
        <table>
          <thead><tr><th>Event</th><th>Count</th></tr></thead>
          <tbody>${eventRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Experiments -->
    <h2 class="section-title">Experiments</h2>
    ${
      activeExperimentCards
        ? `<h3 style="font-size:0.9rem; color:var(--text-dim); margin-bottom:0.75rem;">Active</h3>${activeExperimentCards}`
        : '<p style="color:var(--text-dim)">No active experiments</p>'
    }
    ${
      evaluationCards
        ? `<h3 style="font-size:0.9rem; color:var(--yellow); margin:1rem 0 0.75rem;">🧪 Ready for Evaluation</h3>${evaluationCards}`
        : ""
    }
    ${
      completedExperimentCards
        ? `<h3 style="font-size:0.9rem; color:var(--text-dim); margin:1rem 0 0.75rem;">Recently Completed</h3>${completedExperimentCards}`
        : ""
    }
    ${
      timelineHtml
        ? `<h3 style="font-size:0.9rem; color:var(--text-dim); margin:1.5rem 0 0.75rem;">Experiment Timeline</h3>${timelineHtml}`
        : ""
    }

    <footer>
      BowlingAlleys.io Analytics Pipeline &middot; Auto-generated from weekly report data
    </footer>
  </div>

  <script>
    const chartColors = ['#6366f1','#22c55e','#f97316','#eab308','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f43f5e'];

    // Traffic Sources Doughnut
    new Chart(document.getElementById('trafficChart'), {
      type: 'doughnut',
      data: {
        labels: ${trafficSourceLabels},
        datasets: [{
          data: ${trafficSourceData},
          backgroundColor: chartColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: '#8b8fa3', font: { size: 11 } } }
        }
      }
    });

    // Device Breakdown Doughnut
    new Chart(document.getElementById('deviceChart'), {
      type: 'doughnut',
      data: {
        labels: ${deviceLabels},
        datasets: [{
          data: ${deviceData},
          backgroundColor: chartColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: '#8b8fa3', font: { size: 11 } } }
        }
      }
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// CLI — can be run standalone or imported
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""))) {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: tsx src/generate-html.ts <path-to-weekly-report.json>");
    process.exit(1);
  }

  const reportJson = readFileSync(resolve(jsonPath), "utf-8");
  const report: WeeklyReport = JSON.parse(reportJson);
  const html = generateDashboardHTML(report);

  const outPath = jsonPath.replace(/\.json$/, ".html");
  writeFileSync(outPath, html);
  console.log(`Dashboard HTML written to: ${outPath}`);
}
