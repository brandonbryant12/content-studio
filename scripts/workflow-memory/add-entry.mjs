#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.join("docs", "workflow-memory");
const INDEX_PATH = path.join(MEMORY_DIR, "index.json");
const EVENTS_DIR = path.join(MEMORY_DIR, "events");
const SUMMARIES_DIR = path.join(MEMORY_DIR, "summaries");

const REQUIRED_ARGS = [
  "workflow",
  "title",
  "trigger",
  "finding",
  "evidence",
  "follow_up",
  "owner",
  "status",
];

const USAGE = `Usage:
  node scripts/workflow-memory/add-entry.mjs \\
    --workflow "Feature Delivery" \\
    --title "Short title" \\
    --trigger "What triggered this" \\
    --finding "Decision/finding" \\
    --evidence "File/PR/evidence" \\
    --follow-up "Guardrail/follow-up" \\
    --owner "@team" \\
    --status "open" \\
    [--date YYYY-MM-DD] \\
    [--severity low|medium|high|critical] \\
    [--tags a,b,c] \\
    [--source manual]
`;

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
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

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readJsonlIds(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const ids = new Set();
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.id === "string") {
        ids.add(parsed.id);
      }
    }
    return ids;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return new Set();
    }
    throw error;
  }
}

async function ensureMonthlySummary(month) {
  const summaryPath = path.join(SUMMARIES_DIR, `${month}.md`);
  try {
    await fs.access(summaryPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const template = `# ${month} Workflow Memory Summary

## Top Repeated Patterns

- _No entries yet._

## Guardrails Added

- _No entries yet._

## Open Risks

- _No entries yet._

## Carry-Over Actions

- _No entries yet._
`;
      await fs.writeFile(summaryPath, template, "utf8");
      return;
    }
    throw error;
  }
}

function validateDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function buildEvent(args) {
  const date = args.date ?? new Date().toISOString().slice(0, 10);
  if (!validateDate(date)) {
    throw new Error(`Invalid date: ${date}. Expected YYYY-MM-DD.`);
  }

  for (const key of REQUIRED_ARGS) {
    if (!args[key] || !args[key].trim()) {
      throw new Error(`Missing required argument: --${key.replace(/_/g, "-")}`);
    }
  }

  const workflow = args.workflow.trim();
  const title = args.title.trim();
  const id = args.id?.trim() || `${date}-${slug(workflow)}-${slug(title)}`;

  const tags = args.tags
    ? args.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const severity = (args.severity ?? "medium").trim().toLowerCase();
  const status = args.status.trim().toLowerCase();

  return {
    id,
    date,
    workflow,
    title,
    trigger: args.trigger.trim(),
    finding: args.finding.trim(),
    evidence: args.evidence.trim(),
    followUp: args.follow_up.trim(),
    owner: args.owner.trim(),
    status,
    severity,
    tags,
    source: (args.source ?? "manual").trim(),
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === "true" || args.h === "true") {
    console.log(USAGE);
    return;
  }

  const event = buildEvent(args);
  const month = event.date.slice(0, 7);
  const eventFile = path.join(EVENTS_DIR, `${month}.jsonl`);

  await fs.mkdir(EVENTS_DIR, { recursive: true });
  await fs.mkdir(SUMMARIES_DIR, { recursive: true });

  const existingIds = await readJsonlIds(eventFile);
  if (existingIds.has(event.id)) {
    throw new Error(
      `Event id already exists in ${eventFile}: ${event.id}. Use --id to provide a unique value.`,
    );
  }

  await fs.appendFile(eventFile, `${JSON.stringify(event)}\n`, "utf8");

  const index = await readJsonArray(INDEX_PATH);
  const compactRow = {
    id: event.id,
    date: event.date,
    month,
    workflow: event.workflow,
    title: event.title,
    severity: event.severity,
    status: event.status,
    tags: event.tags,
    eventFile: path.join("events", `${month}.jsonl`),
  };

  const deduped = [
    compactRow,
    ...index.filter((row) => row && typeof row.id === "string" && row.id !== event.id),
  ];
  deduped.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date)));

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(deduped, null, 2)}\n`, "utf8");
  await ensureMonthlySummary(month);

  console.log(`Added workflow memory event: ${event.id}`);
  console.log(`Event file: ${eventFile}`);
  console.log(`Index updated: ${INDEX_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
