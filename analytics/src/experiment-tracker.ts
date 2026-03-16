import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { format } from "date-fns";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPERIMENTS_FILE = resolve(__dirname, "../data/experiments.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExperimentStatus = "proposed" | "running" | "completed" | "winner" | "loser" | "inconclusive" | "abandoned";
export type ExperimentCategory = "seo" | "ux" | "performance" | "content" | "conversion" | "engagement" | "other";

export interface ExperimentMetricSnapshot {
  date: string;
  metrics: Record<string, number>;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  category: ExperimentCategory;
  status: ExperimentStatus;
  priority: "low" | "medium" | "high";

  // What was changed
  description: string;
  affectedPages: string[];
  changesImplemented: string[];

  // Metrics to track
  primaryMetric: string;
  secondaryMetrics: string[];

  // Timeline
  proposedDate: string;
  startDate: string | null;
  endDate: string | null;
  minDuration: string; // e.g. "2 weeks"

  // Results
  baselineSnapshot: ExperimentMetricSnapshot | null;
  endSnapshot: ExperimentMetricSnapshot | null;
  result: string | null;
  learnings: string | null;

  // Links
  relatedCommits: string[];
  notes: string[];
}

interface ExperimentsData {
  experiments: Experiment[];
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function loadExperiments(): Experiment[] {
  if (!existsSync(EXPERIMENTS_FILE)) return [];
  const data: ExperimentsData = JSON.parse(readFileSync(EXPERIMENTS_FILE, "utf-8"));
  return data.experiments;
}

export function saveExperiments(experiments: Experiment[]): void {
  const data: ExperimentsData = {
    experiments,
    lastUpdated: new Date().toISOString(),
  };
  writeFileSync(EXPERIMENTS_FILE, JSON.stringify(data, null, 2));
}

export function createExperiment(input: {
  name: string;
  hypothesis: string;
  category: ExperimentCategory;
  description: string;
  affectedPages: string[];
  primaryMetric: string;
  secondaryMetrics?: string[];
  priority?: "low" | "medium" | "high";
  minDuration?: string;
}): Experiment {
  const experiments = loadExperiments();
  const id = `exp-${format(new Date(), "yyyyMMdd")}-${experiments.length + 1}`;

  const experiment: Experiment = {
    id,
    name: input.name,
    hypothesis: input.hypothesis,
    category: input.category,
    status: "proposed",
    priority: input.priority ?? "medium",
    description: input.description,
    affectedPages: input.affectedPages,
    changesImplemented: [],
    primaryMetric: input.primaryMetric,
    secondaryMetrics: input.secondaryMetrics ?? [],
    proposedDate: format(new Date(), "yyyy-MM-dd"),
    startDate: null,
    endDate: null,
    minDuration: input.minDuration ?? "2 weeks",
    baselineSnapshot: null,
    endSnapshot: null,
    result: null,
    learnings: null,
    relatedCommits: [],
    notes: [],
  };

  experiments.push(experiment);
  saveExperiments(experiments);
  return experiment;
}

export function updateExperiment(
  id: string,
  updates: Partial<Omit<Experiment, "id">>
): Experiment | null {
  const experiments = loadExperiments();
  const idx = experiments.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  experiments[idx] = { ...experiments[idx], ...updates };
  saveExperiments(experiments);
  return experiments[idx];
}

export function startExperiment(
  id: string,
  baselineMetrics: Record<string, number>
): Experiment | null {
  return updateExperiment(id, {
    status: "running",
    startDate: format(new Date(), "yyyy-MM-dd"),
    baselineSnapshot: {
      date: format(new Date(), "yyyy-MM-dd"),
      metrics: baselineMetrics,
    },
  });
}

export function completeExperiment(
  id: string,
  endMetrics: Record<string, number>,
  status: "winner" | "loser" | "inconclusive",
  result: string,
  learnings: string
): Experiment | null {
  return updateExperiment(id, {
    status,
    endDate: format(new Date(), "yyyy-MM-dd"),
    endSnapshot: {
      date: format(new Date(), "yyyy-MM-dd"),
      metrics: endMetrics,
    },
    result,
    learnings,
  });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""))) {
  const experiments = loadExperiments();

  const byStatus = (status: ExperimentStatus) => experiments.filter((e) => e.status === status);

  console.log(`\n${"=".repeat(50)}`);
  console.log("EXPERIMENT TRACKER");
  console.log(`${"=".repeat(50)}\n`);

  console.log(`Total experiments: ${experiments.length}`);
  console.log(`  Proposed:     ${byStatus("proposed").length}`);
  console.log(`  Running:      ${byStatus("running").length}`);
  console.log(`  Winners:      ${byStatus("winner").length}`);
  console.log(`  Losers:       ${byStatus("loser").length}`);
  console.log(`  Inconclusive: ${byStatus("inconclusive").length}`);
  console.log(`  Abandoned:    ${byStatus("abandoned").length}`);

  const running = byStatus("running");
  if (running.length > 0) {
    console.log("\nCurrently Running:");
    running.forEach((e) => {
      console.log(`  [${e.id}] ${e.name}`);
      console.log(`    Hypothesis: ${e.hypothesis}`);
      console.log(`    Started: ${e.startDate} | Primary metric: ${e.primaryMetric}`);
      console.log(`    Pages: ${e.affectedPages.join(", ")}`);
    });
  }

  const proposed = byStatus("proposed");
  if (proposed.length > 0) {
    console.log("\nProposed (ready to start):");
    proposed.forEach((e) => {
      console.log(`  [${e.id}] ${e.name} (${e.priority} priority)`);
      console.log(`    Hypothesis: ${e.hypothesis}`);
    });
  }

  const winners = byStatus("winner");
  if (winners.length > 0) {
    console.log("\nRecent Winners:");
    winners.slice(-3).forEach((e) => {
      console.log(`  [${e.id}] ${e.name}`);
      console.log(`    Result: ${e.result}`);
      console.log(`    Learnings: ${e.learnings}`);
    });
  }
}
