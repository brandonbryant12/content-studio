import {
  CliInputError,
  ExternalToolError,
  PlannerOutputError,
  RoutingConstraintError,
  RunnerConfigurationError,
} from "./errors";
import {
  CODEX_DANGEROUS_FLAG,
  PLANNER_MODEL,
  PLANNER_THINKING,
  VALID_MODELS,
  VALID_THINKING,
  type Operation,
  type OperationRunInput,
  type OperationRunOptions,
} from "./control-plane-types";
import { getOperationOrThrow } from "./control-plane-registry";
import { runCommand, runStreamingCommand } from "../lib/command";

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

const ensureThinking = (value: string | undefined, fallback: string): string => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_THINKING.has(resolved)) {
    throw new CliInputError({
      reason: `Invalid thinking value: ${resolved}. Expected low|medium|high|xhigh.`,
    });
  }
  return resolved;
};

const ensureModel = (value: string | undefined, fallback: string): string => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_MODELS.has(resolved)) {
    throw new CliInputError({
      reason: `Unsupported execution model '${resolved}'. Allowed: ${Array.from(VALID_MODELS).join(", ")}.`,
    });
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
  options: OperationRunOptions,
): Promise<number> => {
  const runner = operation.runner;
  if (runner.type !== "codex-playbook") {
    throw new RunnerConfigurationError({
      reason: `Operation ${operation.id} is not configured for codex-playbook runner.`,
    });
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

  if (options.dryRun) {
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
    throw new ExternalToolError({
      reason: `${errorContext}. ${details}`,
    });
  }

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new ExternalToolError({
      reason: `${errorContext}. Empty response from gh.`,
    });
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
    throw new CliInputError({ reason: `Invalid --issue value: ${explicitIssue}` });
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

  throw new PlannerOutputError({
    reason: "Planner output did not contain a JSON object.",
  });
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
    throw new PlannerOutputError({
      reason: "Planner returned no selectedIssues.",
    });
  }

  const uniqueIssues = Array.from(new Set(selectedIssues));
  if (uniqueIssues.length > 5) {
    throw new PlannerOutputError({
      reason: `Planner selected too many issues (${uniqueIssues.length}); max is 5.`,
    });
  }

  const model = typeof parsed.model === "string" ? parsed.model.trim() : "";
  const thinking = typeof parsed.thinking === "string" ? parsed.thinking.trim() : "";
  if (!VALID_MODELS.has(model)) {
    throw new PlannerOutputError({
      reason: `Planner returned unsupported model '${model}'. Allowed: ${Array.from(VALID_MODELS).join(", ")}.`,
    });
  }
  if (!VALID_THINKING.has(thinking)) {
    throw new PlannerOutputError({
      reason: `Planner returned unsupported thinking '${thinking}'. Allowed: ${Array.from(VALID_THINKING).join(", ")}.`,
    });
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
      throw new RoutingConstraintError({
        reason: `Issue #${issue.number} has multiple model labels: ${modelLabels.join(", ")}.`,
      });
    }
    if (thinkingLabels.length > 1) {
      throw new RoutingConstraintError({
        reason: `Issue #${issue.number} has multiple thinking labels: ${thinkingLabels.join(", ")}.`,
      });
    }

    const issueModel = modelLabels[0]?.replace(/^model:/, "").trim();
    const issueThinking = thinkingLabels[0]?.replace(/^thinking:/, "").trim();

    if (issueModel && issueModel !== model) {
      throw new RoutingConstraintError({
        reason: `Planner/execution model mismatch for issue #${issue.number}: issue label model:${issueModel} vs selected model:${model}.`,
      });
    }
    if (issueThinking && issueThinking !== thinking) {
      throw new RoutingConstraintError({
        reason: `Planner/execution thinking mismatch for issue #${issue.number}: issue label thinking:${issueThinking} vs selected thinking:${thinking}.`,
      });
    }
  }
};

const runReadyForDevRouter = async (
  operation: Operation,
  options: OperationRunOptions,
): Promise<number> => {
  const runner = operation.runner;
  if (runner.type !== "ready-for-dev-router") {
    throw new RunnerConfigurationError({
      reason: `Operation ${operation.id} is not configured for ready-for-dev-router runner.`,
    });
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

  if (options.dryRun) {
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
    throw new ExternalToolError({
      reason: `Ready-for-dev planner call failed. ${details}`,
    });
  }

  const plan = parseReadyForDevPlan(plannerResult.stdout || "");
  const candidateMap = new Map<number, GhIssueCandidate>(candidates.map((issue) => [issue.number, issue]));
  const selectedIssues = plan.selectedIssues.map((issueNumber) => {
    const issue = candidateMap.get(issueNumber);
    if (!issue) {
      throw new PlannerOutputError({
        reason: `Planner selected issue #${issueNumber}, which is not in candidate set.`,
      });
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
      throw new RoutingConstraintError({
        reason: `Issue #${selected.number} is no longer open (state=${issueView.state}).`,
      });
    }
    const hasReadyLabel = issueView.labels.some((label) => label.name === "ready-for-dev");
    if (!hasReadyLabel) {
      throw new RoutingConstraintError({
        reason: `Issue #${selected.number} no longer has ready-for-dev label.`,
      });
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

export const runOperation = async (input: OperationRunInput): Promise<number> => {
  const operation = await getOperationOrThrow(input.operationId);
  const options: OperationRunOptions = {
    issue: input.issue,
    model: input.model,
    thinking: input.thinking,
    dryRun: input.dryRun,
  };

  if (operation.runner.type === "ready-for-dev-router") {
    return await runReadyForDevRouter(operation, options);
  }
  if (operation.runner.type === "codex-playbook") {
    return await runCodexPlaybook(operation, options);
  }
  throw new RunnerConfigurationError({
    reason: `Unsupported runner type for operation ${operation.id}.`,
  });
};
