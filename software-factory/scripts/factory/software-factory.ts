#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { Args, Command, Options } from "@effect/cli";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { runUtilityCommand } from "./utility-command-handlers";
import { UTILITY_USAGE_LINES } from "./utility-command-manifest";
import { runCommand, runStreamingCommand } from "../lib/command";
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
const ROOT_DESCRIPTION = [
  "Software Factory execution control plane.",
  "Terms are strict: Trigger -> Operation -> Strategy -> Skills.",
  "Use --dry-run to print launch commands without executing codex.",
  "",
  "Utility command surfaces:",
  ...UTILITY_USAGE_LINES.map((line) => `- ${line}`),
].join("\n");

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

const runCodexPlaybook = async (
  operation: Operation,
  options: Record<string, string>,
): Promise<number> => {
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

  const result = await runStreamingCommand("codex", codexArgs, {
    cwd: process.cwd(),
    input: prompt,
    allowFailure: true,
  });
  return result.status;
};

const runGhJson = async <T>(args: string[], errorContext: string): Promise<T> => {
  const result = await runCommand("gh", args, {
    cwd: process.cwd(),
    allowFailure: true,
  });
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || "").trim();
    throw new Error(`${errorContext}. ${details}`);
  }

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(`${errorContext}. Empty response from gh.`);
  }
  return JSON.parse(stdout) as T;
};

const listReadyForDevCandidates = async (
  explicitIssue: string | undefined,
): Promise<GhIssueCandidate[]> => {
  const candidates = await runGhJson<GhIssueCandidate[]>(
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

const runReadyForDevRouter = async (
  operation: Operation,
  options: Record<string, string>,
): Promise<number> => {
  const runner = operation.runner;
  if (runner.type !== "ready-for-dev-router") {
    throw new Error(
      `Operation ${operation.id} is not configured for ready-for-dev-router runner.`,
    );
  }

  const candidates = await listReadyForDevCandidates(options.issue?.trim());
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

  const plannerResult = await runCommand("codex", plannerArgs, {
    cwd: process.cwd(),
    input: plannerPrompt,
    allowFailure: true,
  });
  if (plannerResult.status !== 0) {
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
    const issueView = await runGhJson<GhIssueView>(
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

  const result = await runStreamingCommand("codex", codexArgs, {
    cwd: process.cwd(),
    input: prompt,
    allowFailure: true,
  });
  return result.status;
};

const runOperation = async (
  operationId: string,
  rawOptions: Record<string, string>,
): Promise<number> => {
  const operation = await getOperationOrThrow(operationId);

  if (operation.runner.type === "ready-for-dev-router") {
    return await runReadyForDevRouter(operation, rawOptions);
  }
  if (operation.runner.type === "codex-playbook") {
    return await runCodexPlaybook(operation, rawOptions);
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

  const codexVersion = await runCommand("codex", ["--version"], {
    cwd: process.cwd(),
    allowFailure: true,
  });
  checks.push({
    name: "codex --version",
    ok: codexVersion.status === 0,
    details: (codexVersion.stdout || codexVersion.stderr || "").trim(),
  });

  const ghStatus = await runCommand("gh", ["auth", "status"], {
    cwd: process.cwd(),
    allowFailure: true,
  });
  checks.push({
    name: "gh auth status",
    ok: ghStatus.status === 0,
    details: ((ghStatus.stdout || ghStatus.stderr) || "").trim().split("\n")[0] || "",
  });

  let hasMissingRouting = false;
  const routingCheck = await runCommand(
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
    { cwd: process.cwd(), allowFailure: true },
  );
  if (routingCheck.status === 0) {
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

const optionToUndefined = <A>(value: Option.Option<A>): A | undefined =>
  Option.isSome(value) ? value.value : undefined;

const appendBooleanFlag = (argv: string[], flagName: string, enabled: boolean): void => {
  if (enabled) {
    argv.push(`--${flagName}`);
  }
};

const appendValueFlag = (
  argv: string[],
  flagName: string,
  value: string | number | undefined,
): void => {
  if (value !== undefined) {
    argv.push(`--${flagName}`, String(value));
  }
};

const applyExitCode = (status: number): void => {
  if (status !== 0) {
    process.exitCode = status;
  }
};

const executeUtilityCommand = async (
  domain: string,
  action: string,
  argv: string[],
): Promise<void> => {
  const status = await runUtilityCommand(domain, action, argv);
  if (status === null) {
    throw new Error(`Unknown utility command: ${domain} ${action}`);
  }
  applyExitCode(status);
};

const effectFromPromise = (run: () => Promise<void>): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: run,
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

const operationIdArg = Args.text({ name: "operation-id" }).pipe(
  Args.withDescription("Registered operation id."),
);
const triggerIdArg = Args.text({ name: "trigger-id" }).pipe(
  Args.withDescription("Registered trigger id."),
);

const dryRunOption = Options.boolean("dry-run").pipe(
  Options.withDescription("Print launch command without executing codex."),
);
const issueOption = Options.text("issue").pipe(
  Options.optional,
  Options.withDescription("Issue number override."),
);
const modelOption = Options.text("model").pipe(
  Options.optional,
  Options.withDescription("Execution model override."),
);
const thinkingOption = Options.text("thinking").pipe(
  Options.optional,
  Options.withDescription("Execution thinking override (low|medium|high|xhigh)."),
);
const jsonOption = Options.boolean("json").pipe(
  Options.withDescription("Print JSON output."),
);

const skillsCheckCommand = Command.make(
  "check",
  {
    strict: Options.boolean("strict").pipe(
      Options.withDescription("Fail on warnings."),
    ),
    json: jsonOption,
  },
  ({ strict, json }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendBooleanFlag(argv, "strict", strict);
      appendBooleanFlag(argv, "json", json);
      await executeUtilityCommand("skills", "check", argv);
    }),
).pipe(Command.withDescription("Validate skill metadata, contracts, and mirrors."));

const skillsCommand = Command.make("skills", {}).pipe(
  Command.withDescription("Skill quality and consistency tooling."),
  Command.withSubcommands([skillsCheckCommand]),
);

const workflowsGenerateCommand = Command.make(
  "generate",
  {},
  () => effectFromPromise(() => executeUtilityCommand("workflows", "generate", [])),
).pipe(Command.withDescription("Generate workflow catalog README from registry."));

const workflowsCommand = Command.make("workflows", {}).pipe(
  Command.withDescription("Workflow catalog tooling."),
  Command.withSubcommands([workflowsGenerateCommand]),
);

const workflowMemoryAddEntryCommand = Command.make(
  "add-entry",
  {
    workflow: Options.text("workflow"),
    title: Options.text("title"),
    trigger: Options.text("trigger"),
    finding: Options.text("finding"),
    evidence: Options.text("evidence"),
    follow_up: Options.text("follow-up"),
    owner: Options.text("owner"),
    status: Options.text("status"),
    id: Options.text("id").pipe(Options.optional),
    date: Options.text("date").pipe(Options.optional),
    severity: Options.text("severity").pipe(Options.optional),
    tags: Options.text("tags").pipe(Options.optional),
    reflection: Options.text("reflection").pipe(Options.optional),
    feedback: Options.text("feedback").pipe(Options.optional),
    memory_form: Options.text("memory-form").pipe(Options.optional),
    memory_function: Options.text("memory-function").pipe(Options.optional),
    memory_dynamics: Options.text("memory-dynamics").pipe(Options.optional),
    capability: Options.text("capability").pipe(Options.optional),
    failure_mode: Options.text("failure-mode").pipe(Options.optional),
    importance: Options.float("importance").pipe(Options.optional),
    recency: Options.float("recency").pipe(Options.optional),
    confidence: Options.float("confidence").pipe(Options.optional),
    source: Options.text("source").pipe(Options.optional),
    scenario_skill: Options.text("scenario-skill").pipe(Options.optional),
    scenario_check: Options.text("scenario-check").pipe(Options.optional),
    scenario_verdict: Options.text("scenario-verdict").pipe(Options.optional),
    scenario_pattern: Options.text("scenario-pattern").pipe(Options.optional),
    scenario_severity: Options.text("scenario-severity").pipe(Options.optional),
  },
  (input) =>
    effectFromPromise(async () => {
      const argv: string[] = [
        "--workflow",
        input.workflow,
        "--title",
        input.title,
        "--trigger",
        input.trigger,
        "--finding",
        input.finding,
        "--evidence",
        input.evidence,
        "--follow-up",
        input.follow_up,
        "--owner",
        input.owner,
        "--status",
        input.status,
      ];

      appendValueFlag(argv, "id", optionToUndefined(input.id));
      appendValueFlag(argv, "date", optionToUndefined(input.date));
      appendValueFlag(argv, "severity", optionToUndefined(input.severity));
      appendValueFlag(argv, "tags", optionToUndefined(input.tags));
      appendValueFlag(argv, "reflection", optionToUndefined(input.reflection));
      appendValueFlag(argv, "feedback", optionToUndefined(input.feedback));
      appendValueFlag(argv, "memory-form", optionToUndefined(input.memory_form));
      appendValueFlag(argv, "memory-function", optionToUndefined(input.memory_function));
      appendValueFlag(argv, "memory-dynamics", optionToUndefined(input.memory_dynamics));
      appendValueFlag(argv, "capability", optionToUndefined(input.capability));
      appendValueFlag(argv, "failure-mode", optionToUndefined(input.failure_mode));
      appendValueFlag(argv, "importance", optionToUndefined(input.importance));
      appendValueFlag(argv, "recency", optionToUndefined(input.recency));
      appendValueFlag(argv, "confidence", optionToUndefined(input.confidence));
      appendValueFlag(argv, "source", optionToUndefined(input.source));
      appendValueFlag(argv, "scenario-skill", optionToUndefined(input.scenario_skill));
      appendValueFlag(argv, "scenario-check", optionToUndefined(input.scenario_check));
      appendValueFlag(argv, "scenario-verdict", optionToUndefined(input.scenario_verdict));
      appendValueFlag(argv, "scenario-pattern", optionToUndefined(input.scenario_pattern));
      appendValueFlag(argv, "scenario-severity", optionToUndefined(input.scenario_severity));

      await executeUtilityCommand("workflow-memory", "add-entry", argv);
    }),
).pipe(Command.withDescription("Append a workflow-memory event entry."));

const workflowMemoryPreflightCommand = Command.make(
  "preflight",
  {
    bootstrap: Options.boolean("bootstrap"),
    cwd: Options.text("cwd").pipe(Options.optional),
    memory_path: Options.text("memory-path").pipe(Options.optional),
  },
  ({ bootstrap, cwd, memory_path }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendBooleanFlag(argv, "bootstrap", bootstrap);
      appendValueFlag(argv, "cwd", optionToUndefined(cwd));
      appendValueFlag(argv, "memory-path", optionToUndefined(memory_path));
      await executeUtilityCommand("workflow-memory", "preflight", argv);
    }),
).pipe(Command.withDescription("Validate workflow-memory runtime prerequisites."));

const workflowMemorySyncCommand = Command.make(
  "sync",
  {
    remote: Options.text("remote").pipe(Options.optional),
    branch: Options.text("branch").pipe(Options.optional),
    message: Options.text("message").pipe(Options.optional),
    max_attempts: Options.integer("max-attempts").pipe(Options.optional),
    dry_run: dryRunOption,
  },
  ({ remote, branch, message, max_attempts, dry_run }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendValueFlag(argv, "remote", optionToUndefined(remote));
      appendValueFlag(argv, "branch", optionToUndefined(branch));
      appendValueFlag(argv, "message", optionToUndefined(message));
      appendValueFlag(argv, "max-attempts", optionToUndefined(max_attempts));
      appendBooleanFlag(argv, "dry-run", dry_run);
      await executeUtilityCommand("workflow-memory", "sync", argv);
    }),
).pipe(Command.withDescription("Commit and push append-only workflow-memory artifacts."));

const workflowMemoryRetrieveCommand = Command.make(
  "retrieve",
  {
    workflow: Options.text("workflow").pipe(Options.optional),
    tags: Options.text("tags").pipe(Options.optional),
    limit: Options.integer("limit").pipe(Options.optional),
    min_score: Options.float("min-score").pipe(Options.optional),
    month: Options.text("month").pipe(Options.optional),
    has_scenario: Options.boolean("has-scenario"),
    scenario_skill: Options.text("scenario-skill").pipe(Options.optional),
  },
  ({ workflow, tags, limit, min_score, month, has_scenario, scenario_skill }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendValueFlag(argv, "workflow", optionToUndefined(workflow));
      appendValueFlag(argv, "tags", optionToUndefined(tags));
      appendValueFlag(argv, "limit", optionToUndefined(limit));
      appendValueFlag(argv, "min-score", optionToUndefined(min_score));
      appendValueFlag(argv, "month", optionToUndefined(month));
      appendBooleanFlag(argv, "has-scenario", has_scenario);
      appendValueFlag(argv, "scenario-skill", optionToUndefined(scenario_skill));
      await executeUtilityCommand("workflow-memory", "retrieve", argv);
    }),
).pipe(Command.withDescription("Retrieve ranked workflow-memory entries."));

const workflowMemoryCompactCommand = Command.make(
  "compact",
  {
    archive_closed: Options.boolean("archive-closed"),
    days: Options.integer("days").pipe(Options.optional),
    dry_run: dryRunOption,
  },
  ({ archive_closed, days, dry_run }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendBooleanFlag(argv, "archive-closed", archive_closed);
      appendValueFlag(argv, "days", optionToUndefined(days));
      appendBooleanFlag(argv, "dry-run", dry_run);
      await executeUtilityCommand("workflow-memory", "compact", argv);
    }),
).pipe(Command.withDescription("Compact workflow-memory events and rebuild index."));

const workflowMemoryCoverageCommand = Command.make(
  "coverage",
  {
    month: Options.text("month").pipe(Options.optional),
    min: Options.integer("min").pipe(Options.optional),
    strict: Options.boolean("strict"),
    json: jsonOption,
    audit_taxonomy: Options.boolean("audit-taxonomy"),
  },
  ({ month, min, strict, json, audit_taxonomy }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendValueFlag(argv, "month", optionToUndefined(month));
      appendValueFlag(argv, "min", optionToUndefined(min));
      appendBooleanFlag(argv, "strict", strict);
      appendBooleanFlag(argv, "json", json);
      appendBooleanFlag(argv, "audit-taxonomy", audit_taxonomy);
      await executeUtilityCommand("workflow-memory", "coverage", argv);
    }),
).pipe(Command.withDescription("Check monthly workflow-memory coverage."));

const workflowMemoryCommand = Command.make("workflow-memory", {}).pipe(
  Command.withDescription("Workflow-memory maintenance commands."),
  Command.withSubcommands([
    workflowMemoryAddEntryCommand,
    workflowMemoryPreflightCommand,
    workflowMemorySyncCommand,
    workflowMemoryRetrieveCommand,
    workflowMemoryCompactCommand,
    workflowMemoryCoverageCommand,
  ]),
);

const scenarioValidateCommand = Command.make(
  "validate",
  {
    skill: Options.text("skill").pipe(Options.optional),
    check: Options.text("check").pipe(Options.optional),
    id: Options.text("id").pipe(Options.optional),
    month: Options.text("month").pipe(Options.optional),
    json: jsonOption,
    strict: Options.boolean("strict"),
  },
  ({ skill, check, id, month, json, strict }) =>
    effectFromPromise(async () => {
      const argv: string[] = [];
      appendValueFlag(argv, "skill", optionToUndefined(skill));
      appendValueFlag(argv, "check", optionToUndefined(check));
      appendValueFlag(argv, "id", optionToUndefined(id));
      appendValueFlag(argv, "month", optionToUndefined(month));
      appendBooleanFlag(argv, "json", json);
      appendBooleanFlag(argv, "strict", strict);
      await executeUtilityCommand("scenario", "validate", argv);
    }),
).pipe(Command.withDescription("Validate workflow-memory replay scenarios."));

const scenarioCommand = Command.make("scenario", {}).pipe(
  Command.withDescription("Scenario quality commands."),
  Command.withSubcommands([scenarioValidateCommand]),
);

const scriptsLintCommand = Command.make(
  "lint",
  {},
  () => effectFromPromise(() => executeUtilityCommand("scripts", "lint", [])),
).pipe(Command.withDescription("Run software-factory script guardrails."));

const scriptsCommand = Command.make("scripts", {}).pipe(
  Command.withDescription("Script quality commands."),
  Command.withSubcommands([scriptsLintCommand]),
);

const specGenerateCommand = Command.make(
  "generate",
  {},
  () => effectFromPromise(() => executeUtilityCommand("spec", "generate", [])),
).pipe(Command.withDescription("Regenerate docs spec artifacts."));

const specCommand = Command.make("spec", {}).pipe(
  Command.withDescription("Documentation specification commands."),
  Command.withSubcommands([specGenerateCommand]),
);

const operationListCommand = Command.make(
  "list",
  { json: jsonOption },
  ({ json }) => effectFromPromise(() => listOperations(json)),
).pipe(Command.withDescription("List registered operations."));

const operationExplainCommand = Command.make(
  "explain",
  {
    operation_id: operationIdArg,
    json: jsonOption,
  },
  ({ operation_id, json }) => effectFromPromise(() => explainOperation(operation_id, json)),
).pipe(Command.withDescription("Describe one operation and linked triggers."));

const operationRunCommand = Command.make(
  "run",
  {
    operation_id: operationIdArg,
    issue: issueOption,
    model: modelOption,
    thinking: thinkingOption,
    dry_run: dryRunOption,
  },
  ({ operation_id, issue, model, thinking, dry_run }) =>
    effectFromPromise(async () => {
      const overrides: Record<string, string> = {};

      const issueValue = optionToUndefined(issue);
      const modelValue = optionToUndefined(model);
      const thinkingValue = optionToUndefined(thinking);

      if (issueValue !== undefined) {
        overrides.issue = issueValue;
      }
      if (modelValue !== undefined) {
        overrides.model = modelValue;
      }
      if (thinkingValue !== undefined) {
        overrides.thinking = thinkingValue;
      }
      if (dry_run) {
        overrides.dry_run = "true";
      }

      const status = await runOperation(operation_id, overrides);
      applyExitCode(status);
    }),
).pipe(Command.withDescription("Run one operation directly."));

const operationCommand = Command.make("operation", {}).pipe(
  Command.withDescription("Operation inspection and execution."),
  Command.withSubcommands([
    operationListCommand,
    operationExplainCommand,
    operationRunCommand,
  ]),
);

const triggerListCommand = Command.make(
  "list",
  { json: jsonOption },
  ({ json }) => effectFromPromise(() => listTriggers(json)),
).pipe(Command.withDescription("List registered triggers."));

const triggerExplainCommand = Command.make(
  "explain",
  {
    trigger_id: triggerIdArg,
    json: jsonOption,
  },
  ({ trigger_id, json }) => effectFromPromise(() => explainTrigger(trigger_id, json)),
).pipe(Command.withDescription("Describe one trigger and linked operation."));

const triggerFireCommand = Command.make(
  "fire",
  {
    trigger_id: triggerIdArg,
    issue: issueOption,
    model: modelOption,
    thinking: thinkingOption,
    dry_run: dryRunOption,
  },
  ({ trigger_id, issue, model, thinking, dry_run }) =>
    effectFromPromise(async () => {
      const overrides: Record<string, string> = {};

      const issueValue = optionToUndefined(issue);
      const modelValue = optionToUndefined(model);
      const thinkingValue = optionToUndefined(thinking);

      if (issueValue !== undefined) {
        overrides.issue = issueValue;
      }
      if (modelValue !== undefined) {
        overrides.model = modelValue;
      }
      if (thinkingValue !== undefined) {
        overrides.thinking = thinkingValue;
      }
      if (dry_run) {
        overrides.dry_run = "true";
      }

      const status = await fireTrigger(trigger_id, overrides);
      applyExitCode(status);
    }),
).pipe(Command.withDescription("Fire one trigger with optional overrides."));

const triggerCommand = Command.make("trigger", {}).pipe(
  Command.withDescription("Trigger inspection and execution."),
  Command.withSubcommands([
    triggerListCommand,
    triggerExplainCommand,
    triggerFireCommand,
  ]),
);

const doctorCommand = Command.make(
  "doctor",
  {},
  () =>
    effectFromPromise(async () => {
      const status = await runDoctor();
      applyExitCode(status);
    }),
).pipe(Command.withDescription("Run software-factory environment diagnostics."));

const cli = Command.make("software-factory", {}).pipe(
  Command.withDescription(ROOT_DESCRIPTION),
  Command.withSubcommands([
    skillsCommand,
    workflowsCommand,
    workflowMemoryCommand,
    scenarioCommand,
    scriptsCommand,
    specCommand,
    operationCommand,
    triggerCommand,
    doctorCommand,
  ]),
);

const app = Command.run(cli, {
  name: "software-factory",
  version: "0.0.1",
});

const main = async (): Promise<void> => {
  const args = process.argv.length <= 2 ? [...process.argv, "--help"] : process.argv;
  await Effect.runPromise(app(args).pipe(Effect.provide(NodeContext.layer)));
};

runScript(main);
