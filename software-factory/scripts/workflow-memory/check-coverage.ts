import { promises as fs } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { readWorkflowRegistry } from "../workflows/registry";
import { WorkflowMemoryError } from "../factory/cli-errors";

const INDEX_PATH = path.join(
  "software-factory",
  "workflow-memory",
  "index.json",
);


const MEMORY_TRIGGER_TAGS = new Set(["memory", "workflow-memory", "memory-eval"]);
const MEMORY_FORM_PREFIX = "memory-form:";
const MEMORY_FUNCTION_PREFIX = "memory-function:";
const MEMORY_DYNAMICS_PREFIX = "memory-dynamics:";

export type WorkflowMemoryCoverageOptions = {
  month?: string;
  min?: number;
  strict: boolean;
  json: boolean;
  auditTaxonomy: boolean;
};

function validateMonth(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readKnownWorkflows() {
  const registry = await readWorkflowRegistry();
  const workflows = registry.coreWorkflows.map((entry) => entry.memoryKey.trim());

  if (workflows.length === 0) {
    throw new Error(
      "No core workflows found in workflow registry. Add coreWorkflows entries before running coverage.",
    );
  }

  return Array.from(new Set(workflows));
}

function hasTagPrefix(tags, prefix) {
  return tags.some((tag) => tag.startsWith(prefix));
}

function summarizeCoverage(indexRows, month, minPerWorkflow, knownWorkflows) {
  const rowsForMonth = indexRows.filter(
    (row) => row && typeof row.month === "string" && row.month === month,
  );

  const countByWorkflow = new Map(knownWorkflows.map((workflow) => [workflow, 0]));
  const unknownWorkflows = new Map();

  for (const row of rowsForMonth) {
    if (!row || typeof row.workflow !== "string") continue;
    if (countByWorkflow.has(row.workflow)) {
      countByWorkflow.set(row.workflow, (countByWorkflow.get(row.workflow) ?? 0) + 1);
      continue;
    }

    unknownWorkflows.set(row.workflow, (unknownWorkflows.get(row.workflow) ?? 0) + 1);
  }

  const missing = knownWorkflows.filter(
    (workflow) => (countByWorkflow.get(workflow) ?? 0) < minPerWorkflow,
  );

  return {
    knownWorkflows,
    month,
    minPerWorkflow,
    totalRows: rowsForMonth.length,
    countByWorkflow: Object.fromEntries(countByWorkflow.entries()),
    unknownWorkflows: Object.fromEntries(unknownWorkflows.entries()),
    coveredWorkflowCount: knownWorkflows.length - missing.length,
    workflowCount: knownWorkflows.length,
    missingWorkflows: missing,
    rowsForMonth,
  };
}

function findMissingMemoryTaxonomy(rows) {
  const missing = [];

  for (const row of rows) {
    if (!row || !Array.isArray(row.tags)) continue;
    const tags = row.tags.filter((tag) => typeof tag === "string");
    if (tags.length === 0) continue;

    const hasMemoryTags =
      tags.some((tag) => MEMORY_TRIGGER_TAGS.has(tag)) ||
      hasTagPrefix(tags, MEMORY_FORM_PREFIX) ||
      hasTagPrefix(tags, MEMORY_FUNCTION_PREFIX) ||
      hasTagPrefix(tags, MEMORY_DYNAMICS_PREFIX);

    if (!hasMemoryTags) continue;

    if (
      !hasTagPrefix(tags, MEMORY_FORM_PREFIX) ||
      !hasTagPrefix(tags, MEMORY_FUNCTION_PREFIX) ||
      !hasTagPrefix(tags, MEMORY_DYNAMICS_PREFIX)
    ) {
      missing.push({
        id: row.id,
        workflow: row.workflow,
        tags,
        eventFile: row.eventFile,
      });
    }
  }

  return missing;
}

function printHumanReport(summary) {
  console.log(`Workflow memory coverage for ${summary.month}`);
  console.log(
    `Coverage: ${summary.coveredWorkflowCount}/${summary.workflowCount} workflows with >= ${summary.minPerWorkflow} entr${summary.minPerWorkflow === 1 ? "y" : "ies"}`,
  );
  console.log(`Total index rows in month: ${summary.totalRows}`);
  console.log("");

  for (const workflow of summary.knownWorkflows) {
    const count = summary.countByWorkflow[workflow] ?? 0;
    console.log(`- ${workflow}: ${count}`);
  }

  const unknownKeys = Object.keys(summary.unknownWorkflows);
  if (unknownKeys.length > 0) {
    console.log("");
    console.log("Unknown workflow names in index for this month:");
    for (const workflow of unknownKeys.sort()) {
      console.log(`- ${workflow}: ${summary.unknownWorkflows[workflow]}`);
    }
  }

  if (summary.missingWorkflows.length > 0) {
    console.log("");
    console.log("Workflows below threshold:");
    for (const workflow of summary.missingWorkflows) {
      console.log(`- ${workflow}`);
    }
    console.log("");
    console.log(
      'If a listed workflow was actually run, add an event with: pnpm workflow-memory:add-entry --workflow "<Workflow>" ...',
    );
  }

  if (summary.missingMemoryTaxonomy?.length > 0) {
    console.log("");
    console.log("Memory-tagged entries missing taxonomy tags:");
    for (const row of summary.missingMemoryTaxonomy) {
      console.log(`- ${row.id} (${row.workflow})`);
    }
  }
}

const runWorkflowMemoryCoveragePromise = async ({
  month,
  min,
  strict,
  json,
  auditTaxonomy,
}: WorkflowMemoryCoverageOptions): Promise<number> => {
  const monthValue = month ?? currentMonth();
  const minPerWorkflow = min ?? 1;

  if (!validateMonth(monthValue)) {
    throw new Error(`Invalid month: ${monthValue}. Expected YYYY-MM.`);
  }

  if (!Number.isFinite(minPerWorkflow) || minPerWorkflow < 1) {
    throw new Error(`Invalid min threshold: ${minPerWorkflow}. Expected integer >= 1.`);
  }

  const normalizedMin = Math.floor(minPerWorkflow);
  const indexRows = await readIndex();
  const knownWorkflows = await readKnownWorkflows();
  const summary = summarizeCoverage(indexRows, monthValue, normalizedMin, knownWorkflows);
  const missingMemoryTaxonomy = auditTaxonomy
    ? findMissingMemoryTaxonomy(summary.rowsForMonth)
    : [];
  const unknownWorkflowKeys = Object.keys(summary.unknownWorkflows);

  if (json) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          missingMemoryTaxonomy,
        },
        null,
        2,
      ),
    );
  } else {
    printHumanReport({
      ...summary,
      missingMemoryTaxonomy,
    });
  }

  const hasCoverageFailure =
    strict && (summary.missingWorkflows.length > 0 || unknownWorkflowKeys.length > 0);
  const hasTaxonomyFailure = strict && auditTaxonomy && missingMemoryTaxonomy.length > 0;

  return hasCoverageFailure || hasTaxonomyFailure ? 1 : 0;
};

export const runWorkflowMemoryCoverage = (
  options: WorkflowMemoryCoverageOptions,
): Effect.Effect<number, WorkflowMemoryError> =>
  Effect.tryPromise({
    try: () => runWorkflowMemoryCoveragePromise(options),
    catch: (error) =>
      new WorkflowMemoryError({
        command: "workflow-memory:coverage",
        reason: error instanceof Error ? error.message : String(error),
      }),
  });
