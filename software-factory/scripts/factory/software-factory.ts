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
  labelingContext?: {
    modelLabels?: string[];
    thinkingLabels?: string[];
    decisionLabels?: string[];
  };
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

type GhIssueCandidate = {
  number: number;
  title: string;
  url: string;
  labels: GhIssueLabel[];
};

type ReadyForDevPlan = {
  selectedIssues: number[];
  model: string;
  thinking: string;
  rationale?: string;
};

const OPERATIONS_PATH = path.join("software-factory", "operations", "registry.json");
const TRIGGERS_PATH = path.join("software-factory", "triggers", "registry.json");
const VALID_THINKING = new Set(["low", "medium", "high", "xhigh"]);
const VALID_MODELS = new Set(["gpt-5.3-codex", "gpt-5.3-codex-spark"]);
const PLANNER_MODEL = "gpt-5.3-codex";
const PLANNER_THINKING = "xhigh";
const CODEX_DANGEROUS_FLAG = "--dangerously-bypass-approvals-and-sandbox";

const USAGE = `software-factory

Usage:
  pnpm software-factory operation list [--json]
  pnpm software-factory operation explain <operation-id> [--json]
  pnpm software-factory operation run <operation-id> [--issue <n>] [--model <model>] [--thinking <level>] [--dry-run]
  pnpm software-factory trigger list [--json]
  pnpm software-factory trigger explain <trigger-id> [--json]
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

const getOperationOrThrow = async (operationId: string): Promise<Operation> => {
  const operations = await readOperations();
  const operation = operations.find((entry) => entry.id === operationId);
  if (!operation) {
    throw new Error(`Unknown operation: ${operationId}`);
  }
  return operation;
};

const getTriggerOrThrow = async (triggerId: string): Promise<Trigger> => {
  const triggers = await readTriggers();
  const trigger = triggers.find((entry) => entry.id === triggerId);
  if (!trigger) {
    throw new Error(`Unknown trigger: ${triggerId}`);
  }
  return trigger;
};

const ensureThinking = (value: string | undefined, fallback: string): string => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_THINKING.has(resolved)) {
    throw new Error(`Invalid thinking value: ${resolved}. Expected low|medium|high|xhigh.`);
  }
  return resolved;
};

const ensureModel = (value: string | undefined, fallback: string): string => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_MODELS.has(resolved)) {
    throw new Error(
      `Unsupported execution model '${resolved}'. Allowed: ${Array.from(VALID_MODELS).join(", ")}.`,
    );
  }
  return resolved;
};

const readOptionalModelOverride = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return ensureModel(value, "");
};

const readOptionalThinkingOverride = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return ensureThinking(value, "");
};

const runCodexPlaybook = (
  operation: Operation,
  options: Record<string, string>,
): number => {
  const runner = operation.runner;
  if (runner.type !== "codex-playbook") {
    throw new Error(`Operation ${operation.id} is not configured for codex-playbook runner.`);
  }

  const model = ensureModel(options.model, operation.defaultModel);
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
  const labelContext = operation.labelingContext;
  if (
    labelContext &&
    ((labelContext.modelLabels?.length ?? 0) > 0 ||
      (labelContext.thinkingLabels?.length ?? 0) > 0 ||
      (labelContext.decisionLabels?.length ?? 0) > 0)
  ) {
    promptLines.push("", "Operation label context:");
    if ((labelContext.modelLabels?.length ?? 0) > 0) {
      promptLines.push(`- Allowed model labels: ${labelContext.modelLabels?.join(", ")}`);
    }
    if ((labelContext.thinkingLabels?.length ?? 0) > 0) {
      promptLines.push(`- Allowed thinking labels: ${labelContext.thinkingLabels?.join(", ")}`);
    }
    if ((labelContext.decisionLabels?.length ?? 0) > 0) {
      promptLines.push(`- Allowed decision labels: ${labelContext.decisionLabels?.join(", ")}`);
    }
  }
  if (issue) {
    promptLines.push(`- Focus issue: #${issue}`);
  }
  const prompt = `${promptLines.join("\n")}\n`;

  const codexArgs = [
    "exec",
    CODEX_DANGEROUS_FLAG,
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

const listReadyForDevCandidates = (explicitIssue: string | undefined): GhIssueCandidate[] => {
  const candidates = runGhJson<GhIssueCandidate[]>(
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
      "number,title,url,labels",
    ],
    "Failed to list ready-for-dev issues",
  );

  const sorted = [...candidates].sort((a, b) => a.number - b.number);
  if (!explicitIssue) {
    return sorted;
  }
  const issueNumber = Number.parseInt(explicitIssue, 10);
  if (!Number.isFinite(issueNumber)) {
    throw new Error(`Invalid --issue value: ${explicitIssue}`);
  }
  return sorted.filter((issue) => issue.number === issueNumber);
};

const extractJsonObject = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  const fencedMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("Planner output did not contain a JSON object.");
};

const parseReadyForDevPlan = (raw: string): ReadyForDevPlan => {
  const jsonPayload = extractJsonObject(raw);
  const parsed = JSON.parse(jsonPayload) as Partial<ReadyForDevPlan>;

  const selectedIssues = Array.isArray(parsed.selectedIssues)
    ? parsed.selectedIssues
        .filter((value): value is number => Number.isInteger(value))
        .map((value) => Number(value))
    : [];

  if (selectedIssues.length === 0) {
    throw new Error("Planner returned no selectedIssues.");
  }

  const uniqueIssues = Array.from(new Set(selectedIssues));
  if (uniqueIssues.length > 5) {
    throw new Error(`Planner selected too many issues (${uniqueIssues.length}); max is 5.`);
  }

  const model = typeof parsed.model === "string" ? parsed.model.trim() : "";
  const thinking = typeof parsed.thinking === "string" ? parsed.thinking.trim() : "";
  if (!VALID_MODELS.has(model)) {
    throw new Error(
      `Planner returned unsupported model '${model}'. Allowed: ${Array.from(VALID_MODELS).join(", ")}.`,
    );
  }
  if (!VALID_THINKING.has(thinking)) {
    throw new Error(
      `Planner returned unsupported thinking '${thinking}'. Allowed: ${Array.from(VALID_THINKING).join(", ")}.`,
    );
  }

  return {
    selectedIssues: uniqueIssues,
    model,
    thinking,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
  };
};

const ensureIssueRoutingCompatibility = (
  issues: GhIssueCandidate[],
  model: string,
  thinking: string,
): void => {
  for (const issue of issues) {
    const modelLabels = issue.labels
      .map((label) => label.name)
      .filter((name) => name.startsWith("model:"));
    const thinkingLabels = issue.labels
      .map((label) => label.name)
      .filter((name) => name.startsWith("thinking:"));

    if (modelLabels.length > 1) {
      throw new Error(`Issue #${issue.number} has multiple model labels: ${modelLabels.join(", ")}.`);
    }
    if (thinkingLabels.length > 1) {
      throw new Error(
        `Issue #${issue.number} has multiple thinking labels: ${thinkingLabels.join(", ")}.`,
      );
    }

    const issueModel = modelLabels[0]?.replace(/^model:/, "").trim();
    const issueThinking = thinkingLabels[0]?.replace(/^thinking:/, "").trim();

    if (issueModel && issueModel !== model) {
      throw new Error(
        `Planner/execution model mismatch for issue #${issue.number}: issue label model:${issueModel} vs selected model:${model}.`,
      );
    }
    if (issueThinking && issueThinking !== thinking) {
      throw new Error(
        `Planner/execution thinking mismatch for issue #${issue.number}: issue label thinking:${issueThinking} vs selected thinking:${thinking}.`,
      );
    }
  }
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

  const candidates = listReadyForDevCandidates(options.issue?.trim());
  if (candidates.length === 0) {
    console.log("No open issues with label ready-for-dev.");
    return 0;
  }

  const modelOverride = readOptionalModelOverride(options.model);
  const thinkingOverride = readOptionalThinkingOverride(options.thinking);

  const plannerPrompt = [
    "You are selecting a coherent ready-for-dev implementation bundle.",
    "Select 1 to 5 issues that are tightly related and can be implemented together in one PR.",
    "All selected issues must use the same model and thinking profile.",
    "Allowed model labels: model:gpt-5.3-codex, model:gpt-5.3-codex-spark",
    "Allowed thinking labels: thinking:low, thinking:medium, thinking:high, thinking:xhigh",
    "Use issue labels as hard routing constraints when present.",
    "If a selected issue has model/thinking labels, selected model/thinking must match them.",
    "Prefer conservative bundles (smaller is better) when uncertain.",
    "Return ONLY a single JSON object with this exact shape:",
    '{"selectedIssues":[<issue numbers>],"model":"<model id>","thinking":"<thinking level>","rationale":"<short reason>"}',
    "",
    "Candidates JSON:",
    JSON.stringify(
      candidates.map((issue) => ({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        labels: issue.labels.map((label) => label.name),
      })),
      null,
      2,
    ),
    "",
  ].join("\n");

  const plannerArgs = [
    "exec",
    CODEX_DANGEROUS_FLAG,
    "-m",
    PLANNER_MODEL,
    "-c",
    `model_reasoning_effort="${PLANNER_THINKING}"`,
    "-C",
    process.cwd(),
    "-",
  ];

  if (asBool(options.dry_run)) {
    if (modelOverride) {
      console.log(`Execution model override: ${modelOverride}`);
    }
    if (thinkingOverride) {
      console.log(`Execution thinking override: ${thinkingOverride}`);
    }
    console.log(`Planner candidates: ${candidates.length}`);
    console.log("Planner dry run command:");
    console.log(`  codex ${plannerArgs.join(" ")}`);
    console.log("");
    console.log("Execution dry run command template:");
    console.log(
      `  codex exec ${CODEX_DANGEROUS_FLAG} -m <model-from-planner> -c model_reasoning_effort="<thinking-from-planner>" -C ${process.cwd()} -`,
    );
    return 0;
  }

  const plannerResult = spawnSync("codex", plannerArgs, {
    cwd: process.cwd(),
    input: plannerPrompt,
    encoding: "utf8",
  });
  if ((plannerResult.status ?? 1) !== 0) {
    const details = (plannerResult.stderr || plannerResult.stdout || "").trim();
    throw new Error(`Ready-for-dev planner call failed. ${details}`);
  }

  const plan = parseReadyForDevPlan(plannerResult.stdout || "");
  const candidateMap = new Map<number, GhIssueCandidate>(candidates.map((issue) => [issue.number, issue]));
  const selectedIssues = plan.selectedIssues.map((issueNumber) => {
    const issue = candidateMap.get(issueNumber);
    if (!issue) {
      throw new Error(`Planner selected issue #${issueNumber}, which is not in candidate set.`);
    }
    return issue;
  });

  const model = modelOverride ?? ensureModel(plan.model, "");
  const thinking = thinkingOverride ?? ensureThinking(plan.thinking, "");
  ensureIssueRoutingCompatibility(selectedIssues, model, thinking);

  for (const selected of selectedIssues) {
    const issueView = runGhJson<GhIssueView>(
      [
        "issue",
        "view",
        String(selected.number),
        "--json",
        "number,state,labels",
      ],
      `Failed to re-check issue #${selected.number}`,
    );
    if (issueView.state !== "OPEN") {
      throw new Error(`Issue #${selected.number} is no longer open (state=${issueView.state}).`);
    }
    const hasReadyLabel = issueView.labels.some((label) => label.name === "ready-for-dev");
    if (!hasReadyLabel) {
      throw new Error(`Issue #${selected.number} no longer has ready-for-dev label.`);
    }
  }

  const prompt = [
    "Execute one full `ready-for-dev-executor` run for the selected issue bundle only.",
    "",
    "Selected issues:",
    ...selectedIssues.map(
      (issue) => `- #${issue.number}: ${issue.title} (${issue.url})`,
    ),
    "",
    "Execution routing:",
    `- model: ${model}`,
    `- thinking: ${thinking}`,
    `- planner rationale: ${plan.rationale || "n/a"}`,
    "",
    "Execution contract:",
    `- Read and follow \`${runner.playbookPath}\`.`,
    "- Treat the selected issue list above as the only actionable candidates for this run.",
    "- If any selected issue is no longer actionable, stop with a concise no-op report.",
    "- Do not add additional unlisted issues to scope in this run.",
    "- Complete implementation + validation + delivery workflow exactly as the playbook requires.",
    "- Keep one PR max for this run.",
    "",
  ].join("\n");

  const codexArgs = [
    "exec",
    CODEX_DANGEROUS_FLAG,
    "-m",
    model,
    "-c",
    `model_reasoning_effort="${thinking}"`,
    "-C",
    process.cwd(),
    "-",
  ];

  console.log(`Planner selected ${selectedIssues.length} issue(s).`);
  for (const issue of selectedIssues) {
    console.log(`  - #${issue.number}: ${issue.title}`);
  }
  console.log(`  model:    ${model}`);
  console.log(`  thinking: ${thinking}`);

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
  const operation = await getOperationOrThrow(operationId);

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
      `- ${operation.id} (${operation.name}) | strategy=${operation.strategy} | default=${operation.defaultModel}/${operation.defaultThinking}`,
    );
    console.log(`  description: ${operation.description}`);
    console.log(`  args: ${args || "(none)"}`);
  }
};

const explainOperation = async (operationId: string, json: boolean): Promise<void> => {
  const [operation, triggers] = await Promise.all([getOperationOrThrow(operationId), readTriggers()]);
  const linkedTriggers = triggers.filter((trigger) => trigger.operationId === operation.id);

  if (json) {
    console.log(JSON.stringify({ operation, triggers: linkedTriggers }, null, 2));
    return;
  }

  console.log(`Operation ${operation.id}`);
  console.log(`  name: ${operation.name}`);
  console.log(`  purpose: ${operation.description}`);
  console.log(`  strategy: ${operation.strategy}`);
  console.log(`  defaults: ${operation.defaultModel}/${operation.defaultThinking}`);
  console.log(`  runner: ${operation.runner.type}`);
  console.log(`  playbook: ${operation.runner.playbookPath}`);

  if (operation.args.length === 0) {
    console.log("  args: (none)");
  } else {
    console.log("  args:");
    for (const arg of operation.args) {
      const required = arg.required ? "required" : "optional";
      console.log(`    --${arg.name} (${arg.type}, ${required})`);
      console.log(`      ${arg.description}`);
    }
  }

  if (linkedTriggers.length === 0) {
    console.log("  triggers: (none)");
    return;
  }

  console.log("  triggers:");
  for (const trigger of linkedTriggers) {
    console.log(`    - ${trigger.id} (${trigger.rrule})`);
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
    console.log(`- ${trigger.id} (${trigger.name}) -> ${trigger.operationId}`);
    console.log(`  schedule: ${trigger.rrule}`);
  }
};

const explainTrigger = async (triggerId: string, json: boolean): Promise<void> => {
  const trigger = await getTriggerOrThrow(triggerId);
  const operation = await getOperationOrThrow(trigger.operationId);

  if (json) {
    console.log(JSON.stringify({ trigger, operation }, null, 2));
    return;
  }

  console.log(`Trigger ${trigger.id}`);
  console.log(`  name: ${trigger.name}`);
  console.log(`  schedule: ${trigger.rrule}`);
  console.log(`  operation: ${trigger.operationId}`);
  console.log(`  operation strategy: ${operation.strategy}`);
  console.log(`  operation defaults: ${operation.defaultModel}/${operation.defaultThinking}`);
  console.log(`  operation runner: ${operation.runner.type}`);
  if (Object.keys(trigger.args).length === 0) {
    console.log("  trigger args: (none)");
  } else {
    console.log("  trigger args:");
    for (const [key, value] of Object.entries(trigger.args)) {
      console.log(`    --${key}=${value}`);
    }
  }
};

const fireTrigger = async (
  triggerId: string,
  overrides: Record<string, string>,
): Promise<number> => {
  const trigger = await getTriggerOrThrow(triggerId);

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

  if (domain === "operation" && action === "explain") {
    if (!target) {
      throw new Error(
        "Missing operation id. Usage: software-factory operation explain <operation-id>",
      );
    }
    await explainOperation(target, json);
    return;
  }

  if (domain === "trigger" && action === "explain") {
    if (!target) {
      throw new Error("Missing trigger id. Usage: software-factory trigger explain <trigger-id>");
    }
    await explainTrigger(target, json);
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
