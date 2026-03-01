#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runScript } from "../lib/effect-script";

type Runner =
  | {
      type: "ready-for-dev-router";
      playbookPath: string;
    }
  | {
      type: "codex-playbook";
      playbookPath: string;
    };

type OperationArg = {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
};

type Operation = {
  id: string;
  name: string;
  description: string;
  defaultModel: string;
  defaultThinking: "low" | "medium" | "high" | "xhigh";
  strategy: string;
  args: OperationArg[];
  runner: Runner;
};

type Trigger = {
  id: string;
  name: string;
  operationId: string;
  rrule: string;
  args: Record<string, string>;
};

type Parsed = {
  positionals: string[];
  flags: Record<string, string>;
};

type GhIssueLabel = {
  name: string;
};

type GhIssueView = {
  number: number;
  title: string;
  url: string;
  state: string;
  labels: GhIssueLabel[];
};

const OPERATIONS_PATH = path.join("software-factory", "operations", "registry.json");
const TRIGGERS_PATH = path.join("software-factory", "triggers", "registry.json");
const VALID_THINKING = new Set(["low", "medium", "high", "xhigh"]);
const VALID_MODELS = new Set(["gpt-5.3-codex", "gpt-5.3-codex-spark"]);

const USAGE = `software-factory

Usage:
  pnpm software-factory operation list [--json]
  pnpm software-factory operation run <operation-id> [--issue <n>] [--model <model>] [--thinking <level>] [--dry-run]
  pnpm software-factory trigger list [--json]
  pnpm software-factory trigger fire <trigger-id> [--issue <n>] [--model <model>] [--thinking <level>] [--dry-run]
  pnpm software-factory doctor

Notes:
  - Terms are strict: Trigger -> Operation -> Strategy -> Skills.
  - Use --dry-run to print launch commands without executing codex.
`;

const parseArgs = (argv: string[]): Parsed => {
  const positionals: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2).replace(/-/g, "_");
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = "true";
      continue;
    }
    flags[key] = next;
    i += 1;
  }

  return { positionals, flags };
};

const asBool = (raw: string | undefined): boolean => raw === "true";

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

const readOperations = async (): Promise<Operation[]> => {
  const parsed = await readJson<{ operations: Operation[] }>(OPERATIONS_PATH);
  return parsed.operations;
};

const readTriggers = async (): Promise<Trigger[]> => {
  const parsed = await readJson<{ triggers: Trigger[] }>(TRIGGERS_PATH);
  return parsed.triggers;
};

const ensureThinking = (value: string | undefined, fallback: string): string => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_THINKING.has(resolved)) {
    throw new Error(`Invalid thinking value: ${resolved}. Expected low|medium|high|xhigh.`);
  }
  return resolved;
};

const runCodexPlaybook = (
  operation: Operation,
  options: Record<string, string>,
): number => {
  const runner = operation.runner;
  if (runner.type !== "codex-playbook") {
    throw new Error(`Operation ${operation.id} is not configured for codex-playbook runner.`);
  }

  const model = options.model?.trim() || operation.defaultModel;
  const thinking = ensureThinking(options.thinking, operation.defaultThinking);
  const issue = options.issue?.trim();

  const promptLines = [
    `Execute one full \`${operation.id}\` run.`,
    "",
    "Execution contract:",
    `- Read and execute \`${runner.playbookPath}\` in the repository root before making decisions.`,
    "- Treat that playbook as source of truth.",
    "- If this wrapper conflicts with the playbook, follow the playbook.",
  ];
  if (issue) {
    promptLines.push(`- Focus issue: #${issue}`);
  }
  const prompt = `${promptLines.join("\n")}\n`;

  const codexArgs = [
    "exec",
    "-m",
    model,
    "-c",
    `model_reasoning_effort="${thinking}"`,
    "-C",
    process.cwd(),
    "-",
  ];

  if (asBool(options.dry_run)) {
    console.log(`playbook: ${runner.playbookPath}`);
    console.log(`command: codex ${codexArgs.join(" ")}`);
    console.log("");
    console.log("prompt:");
    console.log(prompt);
    return 0;
  }

  const result = spawnSync("codex", codexArgs, {
    cwd: process.cwd(),
    input: prompt,
    stdio: ["pipe", "inherit", "inherit"],
  });
  return result.status ?? 1;
};

const runGhJson = <T>(args: string[], errorContext: string): T => {
  const result = spawnSync("gh", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if ((result.status ?? 1) !== 0) {
    const details = (result.stderr || result.stdout || "").trim();
    throw new Error(`${errorContext}. ${details}`);
  }

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(`${errorContext}. Empty response from gh.`);
  }
  return JSON.parse(stdout) as T;
};

const resolveReadyForDevIssueNumber = (options: Record<string, string>): string | null => {
  const explicitIssue = options.issue?.trim();
  if (explicitIssue) {
    return explicitIssue;
  }

  const result = spawnSync(
    "gh",
    [
      "issue",
      "list",
      "--state",
      "open",
      "--label",
      "ready-for-dev",
      "--limit",
      "200",
      "--json",
      "number",
      "--jq",
      "sort_by(.number) | .[0].number // empty",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  if ((result.status ?? 1) !== 0) {
    const details = (result.stderr || result.stdout || "").trim();
    throw new Error(`Failed to select ready-for-dev issue. ${details}`);
  }

  const issueNumber = (result.stdout || "").trim();
  return issueNumber || null;
};

const resolveReadyForDevModel = (
  operation: Operation,
  issue: GhIssueView,
  options: Record<string, string>,
): { model: string; thinking: string } => {
  const labels = issue.labels ?? [];
  const modelLabels = labels
    .map((label) => label.name)
    .filter((name) => name.startsWith("model:"));
  const thinkingLabels = labels
    .map((label) => label.name)
    .filter((name) => name.startsWith("thinking:"));

  if (modelLabels.length > 1) {
    throw new Error(
      `Issue #${issue.number} has multiple model labels: ${modelLabels.join(", ")}.`,
    );
  }
  if (thinkingLabels.length > 1) {
    throw new Error(
      `Issue #${issue.number} has multiple thinking labels: ${thinkingLabels.join(", ")}.`,
    );
  }

  const modelFromLabel = modelLabels[0]?.replace(/^model:/, "").trim();
  const thinkingFromLabel = thinkingLabels[0]?.replace(/^thinking:/, "").trim();

  const model = (options.model?.trim() || modelFromLabel || operation.defaultModel).trim();
  const thinking = ensureThinking(options.thinking, thinkingFromLabel || operation.defaultThinking);

  if (!VALID_MODELS.has(model)) {
    throw new Error(
      `Unsupported model value: ${model}. Expected ${Array.from(VALID_MODELS).join(" | ")}.`,
    );
  }

  return { model, thinking };
};

const runReadyForDevRouter = (
  operation: Operation,
  options: Record<string, string>,
): number => {
  const runner = operation.runner;
  if (runner.type !== "ready-for-dev-router") {
    throw new Error(
      `Operation ${operation.id} is not configured for ready-for-dev-router runner.`,
    );
  }

  const issueNumber = resolveReadyForDevIssueNumber(options);
  if (!issueNumber) {
    console.log("No open issues with label ready-for-dev.");
    return 0;
  }

  const issue = runGhJson<GhIssueView>(
    [
      "issue",
      "view",
      issueNumber,
      "--json",
      "number,title,url,state,labels",
    ],
    `Failed to read issue #${issueNumber}`,
  );

  if (issue.state !== "OPEN") {
    throw new Error(`Issue #${issue.number} is not open (state=${issue.state}).`);
  }

  const { model, thinking } = resolveReadyForDevModel(operation, issue, options);
  const prompt = [
    `Execute one full \`ready-for-dev-executor\` run for issue #${issue.number} only.`,
    "",
    "Issue context:",
    `- issue: #${issue.number}`,
    `- title: ${issue.title}`,
    `- url: ${issue.url}`,
    `- model label: model:${model}`,
    `- thinking label: thinking:${thinking}`,
    "",
    "Execution contract:",
    `- Read and follow \`${runner.playbookPath}\`.`,
    `- Treat #${issue.number} as the only actionable candidate for this run.`,
    `- If #${issue.number} is no longer actionable, stop with a concise no-op report.`,
    "- Complete implementation + validation + delivery workflow exactly as the playbook requires.",
    "- Keep one PR max for this run.",
    "",
  ].join("\n");

  const codexArgs = [
    "exec",
    "-m",
    model,
    "-c",
    `model_reasoning_effort="${thinking}"`,
    "-C",
    process.cwd(),
    "-",
  ];

  console.log(`Routing issue #${issue.number}`);
  console.log(`  model:    ${model}`);
  console.log(`  thinking: ${thinking}`);
  console.log(`  url:      ${issue.url}`);

  if (asBool(options.dry_run)) {
    console.log("");
    console.log("Dry run command:");
    console.log(`  codex ${codexArgs.join(" ")}`);
    return 0;
  }

  const result = spawnSync("codex", codexArgs, {
    cwd: process.cwd(),
    input: prompt,
    stdio: ["pipe", "inherit", "inherit"],
  });
  return result.status ?? 1;
};

const runOperation = async (
  operationId: string,
  rawOptions: Record<string, string>,
): Promise<number> => {
  const operations = await readOperations();
  const operation = operations.find((entry) => entry.id === operationId);
  if (!operation) {
    throw new Error(`Unknown operation: ${operationId}`);
  }

  if (operation.runner.type === "ready-for-dev-router") {
    return runReadyForDevRouter(operation, rawOptions);
  }
  if (operation.runner.type === "codex-playbook") {
    return runCodexPlaybook(operation, rawOptions);
  }
  throw new Error(`Unsupported runner type for operation ${operation.id}.`);
};

const listOperations = async (json: boolean): Promise<void> => {
  const operations = await readOperations();
  if (json) {
    console.log(JSON.stringify(operations, null, 2));
    return;
  }

  console.log("Operations");
  for (const operation of operations) {
    const args = operation.args.map((arg) => `--${arg.name}`).join(", ");
    console.log(
      `- ${operation.id} | strategy=${operation.strategy} | default=${operation.defaultModel}/${operation.defaultThinking}`,
    );
    console.log(`  args: ${args || "(none)"}`);
  }
};

const listTriggers = async (json: boolean): Promise<void> => {
  const triggers = await readTriggers();
  if (json) {
    console.log(JSON.stringify(triggers, null, 2));
    return;
  }

  console.log("Triggers");
  for (const trigger of triggers) {
    console.log(`- ${trigger.id} -> ${trigger.operationId}`);
    console.log(`  schedule: ${trigger.rrule}`);
  }
};

const fireTrigger = async (
  triggerId: string,
  overrides: Record<string, string>,
): Promise<number> => {
  const triggers = await readTriggers();
  const trigger = triggers.find((entry) => entry.id === triggerId);
  if (!trigger) {
    throw new Error(`Unknown trigger: ${triggerId}`);
  }

  const mergedArgs: Record<string, string> = {
    ...trigger.args,
    ...overrides,
  };

  return runOperation(trigger.operationId, mergedArgs);
};

const runDoctor = async (): Promise<number> => {
  const checks: Array<{ name: string; ok: boolean; details: string }> = [];

  const paths = [OPERATIONS_PATH, TRIGGERS_PATH];
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      checks.push({ name: candidate, ok: true, details: "found" });
    } catch {
      checks.push({ name: candidate, ok: false, details: "missing" });
    }
  }

  const codexVersion = spawnSync("codex", ["--version"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  checks.push({
    name: "codex --version",
    ok: (codexVersion.status ?? 1) === 0,
    details: (codexVersion.stdout || codexVersion.stderr || "").trim(),
  });

  const ghStatus = spawnSync("gh", ["auth", "status"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  checks.push({
    name: "gh auth status",
    ok: (ghStatus.status ?? 1) === 0,
    details: ((ghStatus.stdout || ghStatus.stderr) || "").trim().split("\n")[0] || "",
  });

  let hasMissingRouting = false;
  const routingCheck = spawnSync(
    "gh",
    [
      "issue",
      "list",
      "--state",
      "open",
      "--label",
      "ready-for-dev",
      "--limit",
      "200",
      "--json",
      "number,labels",
      "--jq",
      '[.[] | {n:.number,m:([.labels[].name|select(startswith("model:"))]|length),t:([.labels[].name|select(startswith("thinking:"))]|length)} | select(.m!=1 or .t!=1)] | length',
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  if ((routingCheck.status ?? 1) === 0) {
    const count = Number.parseInt((routingCheck.stdout || "0").trim(), 10);
    hasMissingRouting = Number.isFinite(count) && count > 0;
    checks.push({
      name: "ready-for-dev routing labels",
      ok: !hasMissingRouting,
      details: hasMissingRouting ? `${count} issues missing model/thinking labels` : "ok",
    });
  } else {
    checks.push({
      name: "ready-for-dev routing labels",
      ok: false,
      details: (routingCheck.stderr || routingCheck.stdout || "").trim(),
    });
  }

  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"}  ${check.name}${check.details ? ` - ${check.details}` : ""}`);
  }

  return checks.every((check) => check.ok) ? 0 : 1;
};

const main = async (): Promise<void> => {
  const parsed = parseArgs(process.argv.slice(2));
  const [domain, action, target] = parsed.positionals;

  if (!domain || parsed.flags.help === "true" || parsed.flags.h === "true") {
    console.log(USAGE);
    return;
  }

  if (domain === "doctor") {
    const code = await runDoctor();
    if (code !== 0) {
      process.exitCode = code;
    }
    return;
  }

  const json = asBool(parsed.flags.json);

  if (domain === "operation" && action === "list") {
    await listOperations(json);
    return;
  }

  if (domain === "operation" && action === "run") {
    if (!target) {
      throw new Error("Missing operation id. Usage: software-factory operation run <operation-id>");
    }
    const code = await runOperation(target, parsed.flags);
    if (code !== 0) {
      process.exitCode = code;
    }
    return;
  }

  if (domain === "trigger" && action === "list") {
    await listTriggers(json);
    return;
  }

  if (domain === "trigger" && action === "fire") {
    if (!target) {
      throw new Error("Missing trigger id. Usage: software-factory trigger fire <trigger-id>");
    }
    const code = await fireTrigger(target, parsed.flags);
    if (code !== 0) {
      process.exitCode = code;
    }
    return;
  }

  throw new Error(`Unknown command: ${parsed.positionals.join(" ")}`);
};

runScript(main);
