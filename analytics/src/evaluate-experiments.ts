// Auto-evaluate running experiments that have passed their minimum duration.
// Compares current GSC/GA4 metrics against baseline snapshots to determine
// winner / loser / inconclusive status.

import { format, differenceInWeeks, differenceInDays, parseISO } from "date-fns";
import type { Experiment } from "./experiment-tracker.js";
import {
  loadExperiments,
  saveExperiments,
  type ExperimentMetricSnapshot,
} from "./experiment-tracker.js";
import type { GSCMetrics } from "./gsc.js";
import type { GA4Metrics } from "./ga4.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  experimentId: string;
  experimentName: string;
  status: "winner" | "loser" | "inconclusive";
  durationWeeks: number;
  summary: string;
  metricChanges: Array<{
    metric: string;
    baseline: number;
    current: number;
    changePct: number;
    improved: boolean;
  }>;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "3 weeks" / "2 weeks" / "14 days" → number of days */
function parseMinDuration(minDuration: string): number {
  const match = minDuration.match(/(\d+)\s*(week|day)/i);
  if (!match) return 14; // default 2 weeks
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return unit.startsWith("week") ? num * 7 : num;
}

/** Check if an experiment has passed its minDuration */
export function isPastMinDuration(exp: Experiment): boolean {
  if (!exp.startDate) return false;
  const start = parseISO(exp.startDate);
  const minDays = parseMinDuration(exp.minDuration);
  const elapsed = differenceInDays(new Date(), start);
  return elapsed >= minDays;
}

/** Calculate percentage change, handling zero baselines */
function pctChange(baseline: number, current: number): number {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return ((current - baseline) / baseline) * 100;
}

// ---------------------------------------------------------------------------
// Collect current metrics that match an experiment's baseline keys
// ---------------------------------------------------------------------------

/**
 * Given a GSC report and the baseline metric keys from an experiment,
 * collect current values for the same metrics.
 *
 * This works by matching metric key patterns:
 * - blog_total_clicks → sum of clicks for all /blog/ pages in GSC
 * - blog_total_impressions → sum of impressions for all /blog/ pages
 * - blog_avg_ctr → total blog clicks / total blog impressions
 * - {slug}_clicks → clicks for the specific blog page
 * - {slug}_impressions → impressions for the specific blog page
 * - {slug}_ctr → ctr for the specific blog page
 */
function collectCurrentMetrics(
  baselineMetrics: Record<string, number>,
  gsc: GSCMetrics
): Record<string, number> {
  const current: Record<string, number> = {};

  // Map of short slug names to URL patterns for matching GSC pages
  const slugMap: Record<string, string> = {
    how_to_aim: "how-to-aim-in-bowling",
    bowling_night_group: "bowling-night-out-group-size-guide",
    bowl_alone: "how-to-bowl-alone-for-practice",
    drinking_games: "bowling-drinking-games",
    how_much_cost: "how-much-does-bowling-cost",
    how_to_score: "how-to-score-bowling",
    cosmic_bowling: "what-is-cosmic-bowling",
    science_angles: "science-of-bowling-angles",
    types_of_bowling: "types-of-bowling",
    elite_drills: "5-elite-drills-improve-consistency",
    best_snacks: "best-bowling-alley-snacks",
  };

  // Aggregate blog totals from GSC topPages
  const blogPages = gsc.topPages.filter(
    (p) => p.page.includes("/blog/")
  );
  const blogTotalClicks = blogPages.reduce((s, p) => s + p.clicks, 0);
  const blogTotalImpressions = blogPages.reduce((s, p) => s + p.impressions, 0);
  const blogAvgCtr = blogTotalImpressions > 0
    ? blogTotalClicks / blogTotalImpressions
    : 0;

  for (const key of Object.keys(baselineMetrics)) {
    // Blog totals
    if (key === "blog_total_clicks") {
      current[key] = blogTotalClicks;
      continue;
    }
    if (key === "blog_total_impressions") {
      current[key] = blogTotalImpressions;
      continue;
    }
    if (key === "blog_avg_ctr") {
      current[key] = blogAvgCtr;
      continue;
    }

    // Per-page metrics: extract the slug prefix and suffix
    const suffixes = ["_clicks", "_impressions", "_ctr"] as const;
    let matched = false;
    for (const suffix of suffixes) {
      if (key.endsWith(suffix)) {
        const prefix = key.slice(0, -suffix.length);
        const urlSlug = slugMap[prefix];
        if (urlSlug) {
          const page = blogPages.find((p) => p.page.includes(urlSlug));
          if (page) {
            if (suffix === "_clicks") current[key] = page.clicks;
            else if (suffix === "_impressions") current[key] = page.impressions;
            else if (suffix === "_ctr") current[key] = page.ctr;
          } else {
            current[key] = 0; // page not found in current data
          }
          matched = true;
        }
        break;
      }
    }

    if (!matched && !(key in current)) {
      // Unknown metric key — skip or zero
      current[key] = 0;
    }
  }

  return current;
}

// ---------------------------------------------------------------------------
// Evaluate a single experiment
// ---------------------------------------------------------------------------

function evaluateExperiment(
  exp: Experiment,
  gsc: GSCMetrics,
  _ga4: GA4Metrics | null
): EvaluationResult | null {
  if (exp.status !== "running" || !exp.startDate || !exp.baselineSnapshot) {
    return null;
  }

  if (!isPastMinDuration(exp)) {
    return null;
  }

  const baseline = exp.baselineSnapshot.metrics;
  const current = collectCurrentMetrics(baseline, gsc);
  const startDate = parseISO(exp.startDate);
  const durationWeeks = differenceInWeeks(new Date(), startDate);

  // Calculate changes for each metric
  const metricChanges = Object.entries(baseline).map(([metric, baseVal]) => {
    const curVal = current[metric] ?? 0;
    const change = pctChange(baseVal, curVal);

    // Determine if improvement: for CTR/clicks = higher is better
    // For position = lower is better (but we don't track position in experiments yet)
    const isPositionMetric = metric.includes("position");
    const improved = isPositionMetric ? curVal < baseVal : curVal > baseVal;

    return {
      metric,
      baseline: baseVal,
      current: curVal,
      changePct: change,
      improved,
    };
  });

  // Determine overall status based on primary metric direction
  // Primary metric for this experiment is "GSC CTR on blog pages" → blog_avg_ctr
  const primaryCandidates = ["blog_avg_ctr", "blog_total_clicks"];
  const primaryChange = metricChanges.find((m) =>
    primaryCandidates.includes(m.metric)
  ) ?? metricChanges[0];

  let status: "winner" | "loser" | "inconclusive";
  let summary: string;
  let recommendation: string;

  if (!primaryChange) {
    status = "inconclusive";
    summary = "Could not find primary metric to compare.";
    recommendation = "Review metrics manually.";
  } else if (primaryChange.changePct > 20) {
    // Significant positive improvement (>20%)
    status = "winner";
    summary = `Primary metric (${primaryChange.metric.replace(/_/g, " ")}) improved by ${primaryChange.changePct.toFixed(1)}% over ${durationWeeks} weeks.`;
    recommendation = "Keep the changes live. Consider similar optimizations for other pages.";
  } else if (primaryChange.changePct > 5) {
    // Moderate positive improvement (5-20%)
    status = "winner";
    summary = `Primary metric (${primaryChange.metric.replace(/_/g, " ")}) showed moderate improvement of ${primaryChange.changePct.toFixed(1)}% over ${durationWeeks} weeks.`;
    recommendation = "Keep changes. The improvement is positive but may need more time to fully materialize.";
  } else if (primaryChange.changePct < -10) {
    // Negative change
    status = "loser";
    summary = `Primary metric (${primaryChange.metric.replace(/_/g, " ")}) declined by ${Math.abs(primaryChange.changePct).toFixed(1)}% over ${durationWeeks} weeks.`;
    recommendation = "Consider reverting changes or investigating other factors that may be causing the decline.";
  } else {
    // Flat (-10% to +5%)
    status = "inconclusive";
    summary = `Primary metric (${primaryChange.metric.replace(/_/g, " ")}) changed by ${primaryChange.changePct.toFixed(1)}% over ${durationWeeks} weeks — not statistically significant.`;
    recommendation = "Continue running the experiment for another 1-2 weeks if possible, or accept as neutral.";
  }

  return {
    experimentId: exp.id,
    experimentName: exp.name,
    status,
    durationWeeks,
    summary,
    metricChanges,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate all running experiments that have passed their minDuration.
 * Returns evaluation results but does NOT auto-apply them.
 * The weekly report will surface these for human review.
 */
export function evaluateRunningExperiments(
  gsc: GSCMetrics,
  ga4: GA4Metrics | null = null
): EvaluationResult[] {
  const experiments = loadExperiments();
  const results: EvaluationResult[] = [];

  for (const exp of experiments) {
    const result = evaluateExperiment(exp, gsc, ga4);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Apply an evaluation result to the experiment — marks it as winner/loser/inconclusive,
 * saves the end snapshot, result text, and learnings.
 * Called after human approval.
 */
export function applyEvaluation(
  result: EvaluationResult,
  gsc: GSCMetrics
): Experiment | null {
  const experiments = loadExperiments();
  const exp = experiments.find((e) => e.id === result.experimentId);
  if (!exp || !exp.baselineSnapshot) return null;

  const endMetrics = collectCurrentMetrics(exp.baselineSnapshot.metrics, gsc);

  exp.status = result.status;
  exp.endDate = format(new Date(), "yyyy-MM-dd");
  exp.endSnapshot = {
    date: format(new Date(), "yyyy-MM-dd"),
    metrics: endMetrics,
  };
  exp.result = result.summary;
  exp.learnings = result.recommendation;

  saveExperiments(experiments);
  return exp;
}

/**
 * Get a summary of which experiments are ready for evaluation and which are still running.
 */
export function getExperimentTimeline(): Array<{
  id: string;
  name: string;
  startDate: string;
  minDuration: string;
  elapsedDays: number;
  daysRemaining: number;
  readyForEvaluation: boolean;
}> {
  const experiments = loadExperiments();
  return experiments
    .filter((e) => e.status === "running" && e.startDate)
    .map((exp) => {
      const start = parseISO(exp.startDate!);
      const minDays = parseMinDuration(exp.minDuration);
      const elapsed = differenceInDays(new Date(), start);
      const remaining = Math.max(0, minDays - elapsed);

      return {
        id: exp.id,
        name: exp.name,
        startDate: exp.startDate!,
        minDuration: exp.minDuration,
        elapsedDays: elapsed,
        daysRemaining: remaining,
        readyForEvaluation: remaining === 0,
      };
    });
}
