#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.join("docs", "workflow-memory");
const INDEX_PATH = path.join(MEMORY_DIR, "index.json");
const EVENTS_DIR = path.join(MEMORY_DIR, "events");
const SUMMARIES_DIR = path.join(MEMORY_DIR, "summaries");
const DEFAULT_LEGACY_PATH = path.join("docs", "workflow-memory.md");

const USAGE = `Usage:
  node agentic-harness-framework/scripts/workflow-memory/migrate-legacy-memory.mjs [--legacy docs/workflow-memory.md] [--dry-run]
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
    if (!token.startsWith("--")) continue;
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

async function readJsonl(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function parseLegacyMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let section = "";
  let current = null;

  const flush = () => {
    if (!current) return;
    entries.push(current);
    current = null;
  };

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      flush();
      section = h2[1].trim();
      continue;
    }

    const h3 = line.match(/^### (\d{4}-\d{2}-\d{2}) - (.+?) - (.+)$/);
    if (h3) {
      flush();
      current = {
        date: h3[1],
        workflow: h3[2].trim(),
        title: h3[3].trim(),
        section,
        fields: {},
      };
      continue;
    }

    if (!current) continue;

    const bullet = line.match(/^- ([^:]+):\s*(.*)$/);
    if (bullet) {
      current.fields[bullet[1].trim()] = bullet[2].trim();
    }
  }

  flush();
  return entries;
}

function toEvent(legacyEntry, sourcePath) {
  const date = legacyEntry.date;
  const workflow = legacyEntry.workflow;
  const title = legacyEntry.title;
  const id = `${date}-${slug(workflow)}-${slug(title)}`;
  const fields = legacyEntry.fields;

  return {
    id,
    date,
    workflow,
    title,
    trigger: fields["Trigger"] ?? "",
    finding: fields["Decision/Finding"] ?? fields["Decision"] ?? "",
    evidence: fields["Evidence"] ?? "",
    followUp: fields["Guardrail/Follow-up"] ?? fields["Follow-up"] ?? "",
    reflection: fields["Reflection"] ?? "",
    feedback: fields["Feedback"] ?? "",
    owner: fields["Owner"] ?? "unknown",
    status: (fields["Status"] ?? "open").toLowerCase(),
    severity: (fields["Severity"] ?? "medium").toLowerCase(),
    tags: [],
    source: `migrated:${sourcePath}`,
    legacySection: legacyEntry.section,
    migratedAt: new Date().toISOString(),
  };
}

async function ensureMonthlySummary(month, dryRun) {
  const summaryPath = path.join(SUMMARIES_DIR, `${month}.md`);
  try {
    await fs.access(summaryPath);
  } catch (error) {
    if (!(error && error.code === "ENOENT")) {
      throw error;
    }

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
    if (!dryRun) {
      await fs.writeFile(summaryPath, template, "utf8");
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true" || args.h === "true") {
    console.log(USAGE);
    return;
  }

  const legacyPath = args.legacy ?? DEFAULT_LEGACY_PATH;
  const dryRun = args.dry_run === "true";

  const legacyContent = await fs.readFile(legacyPath, "utf8");
  const parsedEntries = parseLegacyMarkdown(legacyContent);
  if (parsedEntries.length === 0) {
    console.log(`No legacy entries found in ${legacyPath}.`);
    return;
  }

  const events = parsedEntries.map((entry) => toEvent(entry, legacyPath));

  await fs.mkdir(EVENTS_DIR, { recursive: true });
  await fs.mkdir(SUMMARIES_DIR, { recursive: true });

  const index = await readJsonArray(INDEX_PATH);
  const existingIndexIds = new Set(
    index.filter((row) => row && typeof row.id === "string").map((row) => row.id),
  );

  let imported = 0;
  let skipped = 0;
  const grouped = new Map();

  for (const event of events) {
    if (existingIndexIds.has(event.id)) {
      skipped += 1;
      continue;
    }
    const month = event.date.slice(0, 7);
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month).push(event);
  }

  for (const [month, monthEvents] of grouped) {
    const eventPath = path.join(EVENTS_DIR, `${month}.jsonl`);
    const existingEvents = await readJsonl(eventPath);
    const existingIds = new Set(
      existingEvents
        .filter((entry) => entry && typeof entry.id === "string")
        .map((entry) => entry.id),
    );

    const newEvents = monthEvents.filter((entry) => !existingIds.has(entry.id));
    skipped += monthEvents.length - newEvents.length;

    if (newEvents.length === 0) {
      continue;
    }

    imported += newEvents.length;

    if (!dryRun) {
      const payload = newEvents.map((entry) => JSON.stringify(entry)).join("\n");
      await fs.appendFile(eventPath, `${payload}\n`, "utf8");
    }

    await ensureMonthlySummary(month, dryRun);
  }

  const newIndexRows = [];
  for (const eventsForMonth of grouped.values()) {
    for (const event of eventsForMonth) {
      if (existingIndexIds.has(event.id)) continue;
      const month = event.date.slice(0, 7);
      newIndexRows.push({
        id: event.id,
        date: event.date,
        month,
        workflow: event.workflow,
        title: event.title,
        severity: event.severity,
        status: event.status,
        tags: event.tags,
        eventFile: path.join("events", `${month}.jsonl`),
      });
    }
  }

  if (!dryRun && newIndexRows.length > 0) {
    const merged = [...index, ...newIndexRows];
    merged.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date)));
    await fs.writeFile(INDEX_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  }

  console.log(
    `${dryRun ? "Dry run" : "Migration"} complete. Parsed=${events.length}, imported=${imported}, skipped=${skipped}.`,
  );
  if (dryRun) {
    console.log("No files were changed.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
