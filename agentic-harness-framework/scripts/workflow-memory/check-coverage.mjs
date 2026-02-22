#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const INDEX_PATH = path.join("docs", "workflow-memory", "index.json");

const KNOWN_WORKFLOWS = [
  "Intake + Triage",
  "Feature Delivery",
  "TanStack + Vite",
  "Architecture + ADR Guard",
  "PR Risk Review",
  "Test Surface Steward",
  "Security + Dependency Hygiene",
  "Performance + Cost Guard",
  "Docs + Knowledge Drift",
  "Periodic Scans",
  "Release + Incident Response",
  "Self-Improvement",
];

const USAGE = `Usage:
  node agentic-harness-framework/scripts/workflow-memory/check-coverage.mjs [--month YYYY-MM] [--min 1] [--strict] [--json]

Examples:
  node agentic-harness-framework/scripts/workflow-memory/check-coverage.mjs
  node agentic-harness-framework/scripts/workflow-memory/check-coverage.mjs --month 2026-02 --strict
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    if (token === "--") {
      continue;
    }

    const key = token.slice(2).replace(/-/g, "_");
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

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

function parsePositiveInt(raw, fallback) {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function summarizeCoverage(indexRows, month, minPerWorkflow) {
  const rowsForMonth = indexRows.filter(
    (row) => row && typeof row.month === "string" && row.month === month,
  );

  const countByWorkflow = new Map(KNOWN_WORKFLOWS.map((workflow) => [workflow, 0]));
  const unknownWorkflows = new Map();

  for (const row of rowsForMonth) {
    if (!row || typeof row.workflow !== "string") continue;
    if (countByWorkflow.has(row.workflow)) {
      countByWorkflow.set(row.workflow, (countByWorkflow.get(row.workflow) ?? 0) + 1);
      continue;
    }

    unknownWorkflows.set(row.workflow, (unknownWorkflows.get(row.workflow) ?? 0) + 1);
  }

  const missing = KNOWN_WORKFLOWS.filter(
    (workflow) => (countByWorkflow.get(workflow) ?? 0) < minPerWorkflow,
  );

  return {
    month,
    minPerWorkflow,
    totalRows: rowsForMonth.length,
    countByWorkflow: Object.fromEntries(countByWorkflow.entries()),
    unknownWorkflows: Object.fromEntries(unknownWorkflows.entries()),
    coveredWorkflowCount: KNOWN_WORKFLOWS.length - missing.length,
    workflowCount: KNOWN_WORKFLOWS.length,
    missingWorkflows: missing,
  };
}

function printHumanReport(summary) {
  console.log(`Workflow memory coverage for ${summary.month}`);
  console.log(
    `Coverage: ${summary.coveredWorkflowCount}/${summary.workflowCount} workflows with >= ${summary.minPerWorkflow} entr${summary.minPerWorkflow === 1 ? "y" : "ies"}`,
  );
  console.log(`Total index rows in month: ${summary.totalRows}`);
  console.log("");

  for (const workflow of KNOWN_WORKFLOWS) {
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
      'If a listed workflow was actually run, add an event with: node agentic-harness-framework/scripts/workflow-memory/add-entry.mjs --workflow "<Workflow>" ...',
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true" || args.h === "true") {
    console.log(USAGE);
    return;
  }

  const month = args.month ?? currentMonth();
  if (!validateMonth(month)) {
    throw new Error(`Invalid month: ${month}. Expected YYYY-MM.`);
  }

  const minPerWorkflow = parsePositiveInt(args.min, 1);
  const strict = args.strict === "true";
  const json = args.json === "true";

  const indexRows = await readIndex();
  const summary = summarizeCoverage(indexRows, month, minPerWorkflow);

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printHumanReport(summary);
  }

  if (strict && summary.missingWorkflows.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
