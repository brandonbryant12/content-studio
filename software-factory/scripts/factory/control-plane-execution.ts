import { Effect } from "effect";
import {
  CliInputError,
  ExternalToolError,
  PolicyViolationError,
  unknownErrorMessage,
} from "./cli-errors";
import { CliConfig, CliConsole, CliProcess } from "./cli-services";
import {
  CODEX_DANGEROUS_FLAG,
  PLANNER_MODEL,
  PLANNER_THINKING,
  VALID_MODELS,
  VALID_THINKING,
  type Operation,
  type OperationRunArgs,
  type OperationRunInput,
} from "./control-plane-types";

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

type OperationExecutionError = CliInputError | ExternalToolError | PolicyViolationError;
type OperationExecutionEnv = CliProcess | CliConsole | CliConfig;

const DEFAULT_CODEX_PLAYBOOK_TIMEOUT_MS = 90 * 60 * 1000;
const DEFAULT_READY_FOR_DEV_PLANNER_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_READY_FOR_DEV_EXECUTOR_TIMEOUT_MS = 90 * 60 * 1000;

const parseTimeoutOverride = (raw: string | undefined): number | undefined => {
  if (raw === undefined || raw.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

const resolveTimeoutMs = (envKey: string, fallbackMs: number): number =>
  parseTimeoutOverride(process.env[envKey]) ?? fallbackMs;

const CODEX_PLAYBOOK_TIMEOUT_MS = resolveTimeoutMs(
  "SOFTWARE_FACTORY_CODEX_PLAYBOOK_TIMEOUT_MS",
  DEFAULT_CODEX_PLAYBOOK_TIMEOUT_MS,
);
const READY_FOR_DEV_PLANNER_TIMEOUT_MS = resolveTimeoutMs(
  "SOFTWARE_FACTORY_READY_FOR_DEV_PLANNER_TIMEOUT_MS",
  DEFAULT_READY_FOR_DEV_PLANNER_TIMEOUT_MS,
);
const READY_FOR_DEV_EXECUTOR_TIMEOUT_MS = resolveTimeoutMs(
  "SOFTWARE_FACTORY_READY_FOR_DEV_EXECUTOR_TIMEOUT_MS",
  DEFAULT_READY_FOR_DEV_EXECUTOR_TIMEOUT_MS,
);
const ISSUE_EVALUATOR_FALLBACK_OPERATION: Operation = {
  id: "issue-evaluator",
  name: "Issue Evaluator",
  description: "Evaluates open issues and applies ready-for-dev, human-eval-needed, or rejected decisions.",
  defaultModel: "gpt-5.3-codex",
  defaultThinking: "xhigh",
  strategy: "periodic-scans",
  args: [],
  labelingContext: {
    modelLabels: ["model:gpt-5.3-codex", "model:gpt-5.3-codex-spark"],
    thinkingLabels: ["thinking:low", "thinking:medium", "thinking:high", "thinking:xhigh"],
    decisionLabels: ["ready-for-dev", "human-eval-needed", "rejected"],
  },
  runner: {
    type: "codex-playbook",
    playbookPath: "automations/issue-evaluator/issue-evaluator.md",
  },
};
const ADVISORY_LANE_OPERATION_IDS = new Set([
  "issue-evaluator",
  "best-practice-researcher",
  "software-factory-researcher",
  "product-vision-researcher",
  "product-owner-reviewer",
]);

const readArg = (args: OperationRunArgs, key: string): string | number | boolean | undefined =>
  Object.prototype.hasOwnProperty.call(args, key) ? args[key] : undefined;

const readStringArg = (args: OperationRunArgs, key: string): string | undefined => {
  const value = readArg(args, key);
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
};

const readBooleanArg = (args: OperationRunArgs, key: string): boolean => {
  const value = readArg(args, key);
  return value === true;
};

const ensureThinking = (
  value: string | undefined,
  fallback: string,
): Effect.Effect<string, CliInputError> => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_THINKING.has(resolved)) {
    return Effect.fail(
      new CliInputError({
        reason: `Invalid thinking value: ${resolved}. Expected low|medium|high|xhigh.`,
      }),
    );
  }
  return Effect.succeed(resolved);
};

const ensureModel = (
  value: string | undefined,
  fallback: string,
): Effect.Effect<string, CliInputError> => {
  const resolved = (value ?? fallback).trim();
  if (!VALID_MODELS.has(resolved)) {
    return Effect.fail(
      new CliInputError({
        reason: `Unsupported execution model '${resolved}'. Allowed: ${Array.from(VALID_MODELS).join(", ")}.`,
      }),
    );
  }
  return Effect.succeed(resolved);
};

const readOptionalModelOverride = (
  value: string | undefined,
): Effect.Effect<string | undefined, CliInputError> => {
  if (value === undefined || value.trim().length === 0) {
    return Effect.succeed(undefined);
  }
  return ensureModel(value, "").pipe(Effect.map((resolved) => resolved));
};

const readOptionalThinkingOverride = (
  value: string | undefined,
): Effect.Effect<string | undefined, CliInputError> => {
  if (value === undefined || value.trim().length === 0) {
    return Effect.succeed(undefined);
  }
  return ensureThinking(value, "").pipe(Effect.map((resolved) => resolved));
};

const runGhJson = <T>(args: string[], errorContext: string): Effect.Effect<T, ExternalToolError, CliProcess | CliConfig> =>
  Effect.gen(function* () {
    const processService = yield* CliProcess;
    const config = yield* CliConfig;

    const result = yield* processService.run("gh", args, {
      cwd: config.cwd,
      allowFailure: true,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExternalToolError({
            reason: `${errorContext}. ${unknownErrorMessage(error)}`,
          }),
      ),
    );

    if (result.status !== 0) {
      const details = (result.stderr || result.stdout || "").trim();
      return yield* Effect.fail(
        new ExternalToolError({
          reason: `${errorContext}. ${details}`,
        }),
      );
    }

    const stdout = (result.stdout || "").trim();
    if (!stdout) {
      return yield* Effect.fail(
        new ExternalToolError({
          reason: `${errorContext}. Empty response from gh.`,
        }),
      );
    }

    const parsed = yield* Effect.try({
      try: () => JSON.parse(stdout) as T,
      catch: (error) =>
        new ExternalToolError({
          reason: `${errorContext}. Invalid JSON output: ${unknownErrorMessage(error)}`,
        }),
    });

    return parsed;
  });

const listReadyForDevCandidates = (
  explicitIssue: string | undefined,
): Effect.Effect<GhIssueCandidate[], CliInputError | ExternalToolError, CliProcess | CliConfig> =>
  Effect.gen(function* () {
    const candidates = yield* runGhJson<GhIssueCandidate[]>(
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
      return yield* Effect.fail(
        new CliInputError({
          reason: `Invalid --issue value: ${explicitIssue}`,
        }),
      );
    }

    return sorted.filter((issue) => issue.number === issueNumber);
  });

const extractJsonObject = (raw: string): Effect.Effect<string, PolicyViolationError> => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return Effect.succeed(trimmed);
  }

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedJsonMatch?.[1]) {
    return Effect.succeed(fencedJsonMatch[1].trim());
  }

  const fencedMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (fencedMatch?.[1]) {
    return Effect.succeed(fencedMatch[1].trim());
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return Effect.succeed(trimmed.slice(start, end + 1));
  }

  return Effect.fail(
    new PolicyViolationError({
      reason: "Planner output did not contain a JSON object.",
    }),
  );
};

const parseReadyForDevPlan = (raw: string): Effect.Effect<ReadyForDevPlan, PolicyViolationError> =>
  Effect.gen(function* () {
    const jsonPayload = yield* extractJsonObject(raw);
    const parsed = yield* Effect.try({
      try: () => JSON.parse(jsonPayload) as Partial<ReadyForDevPlan>,
      catch: (error) =>
        new PolicyViolationError({
          reason: `Planner output is not valid JSON: ${unknownErrorMessage(error)}`,
        }),
    });

    const selectedIssues = Array.isArray(parsed.selectedIssues)
      ? parsed.selectedIssues
          .filter((value): value is number => Number.isInteger(value))
          .map((value) => Number(value))
      : [];

    if (selectedIssues.length === 0) {
      return yield* Effect.fail(
        new PolicyViolationError({
          reason: "Planner returned no selectedIssues.",
        }),
      );
    }

    const uniqueIssues = Array.from(new Set(selectedIssues));
    if (uniqueIssues.length > 5) {
      return yield* Effect.fail(
        new PolicyViolationError({
          reason: `Planner selected too many issues (${uniqueIssues.length}); max is 5.`,
        }),
      );
    }

    const normalizePlannerModel = (value: string): string =>
      value.replace(/^model:/, "").trim();
    const normalizePlannerThinking = (value: string): string =>
      value.replace(/^thinking:/, "").trim();

    const model = typeof parsed.model === "string" ? normalizePlannerModel(parsed.model) : "";
    const thinking =
      typeof parsed.thinking === "string" ? normalizePlannerThinking(parsed.thinking) : "";
    if (!VALID_MODELS.has(model)) {
      return yield* Effect.fail(
        new PolicyViolationError({
          reason: `Planner returned unsupported model '${model}'. Allowed: ${Array.from(VALID_MODELS).join(", ")}.`,
        }),
      );
    }

    if (!VALID_THINKING.has(thinking)) {
      return yield* Effect.fail(
        new PolicyViolationError({
          reason: `Planner returned unsupported thinking '${thinking}'. Allowed: ${Array.from(VALID_THINKING).join(", ")}.`,
        }),
      );
    }

    return {
      selectedIssues: uniqueIssues,
      model,
      thinking,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
    };
  });

const ensureIssueRoutingCompatibility = (
  issues: readonly GhIssueCandidate[],
  model: string,
  thinking: string,
): Effect.Effect<void, PolicyViolationError> => {
  for (const issue of issues) {
    const modelLabels = issue.labels
      .map((label) => label.name)
      .filter((name) => name.startsWith("model:"));
    const thinkingLabels = issue.labels
      .map((label) => label.name)
      .filter((name) => name.startsWith("thinking:"));

    if (modelLabels.length > 1) {
      return Effect.fail(
        new PolicyViolationError({
          reason: `Issue #${issue.number} has multiple model labels: ${modelLabels.join(", ")}.`,
        }),
      );
    }
    if (thinkingLabels.length > 1) {
      return Effect.fail(
        new PolicyViolationError({
          reason: `Issue #${issue.number} has multiple thinking labels: ${thinkingLabels.join(", ")}.`,
        }),
      );
    }

    const issueModel = modelLabels[0]?.replace(/^model:/, "").trim();
    const issueThinking = thinkingLabels[0]?.replace(/^thinking:/, "").trim();
    if (issueModel && issueModel !== model) {
      return Effect.fail(
        new PolicyViolationError({
          reason: `Planner/execution model mismatch for issue #${issue.number}: issue label model:${issueModel} vs selected model:${model}.`,
        }),
      );
    }
    if (issueThinking && issueThinking !== thinking) {
      return Effect.fail(
        new PolicyViolationError({
          reason: `Planner/execution thinking mismatch for issue #${issue.number}: issue label thinking:${issueThinking} vs selected thinking:${thinking}.`,
        }),
      );
    }
  }

  return Effect.void;
};

const runCodexPlaybook = (
  operation: Operation,
  args: OperationRunArgs,
): Effect.Effect<number, OperationExecutionError, OperationExecutionEnv> =>
  Effect.gen(function* () {
    const processService = yield* CliProcess;
    const config = yield* CliConfig;
    const cliConsole = yield* CliConsole;
    const runner = operation.runner;

    if (runner.type !== "codex-playbook") {
      return yield* Effect.fail(
        new PolicyViolationError({
          reason: `Operation ${operation.id} is not configured for codex-playbook runner.`,
        }),
      );
    }

    const model = yield* ensureModel(readStringArg(args, "model"), operation.defaultModel);
    const thinking = yield* ensureThinking(readStringArg(args, "thinking"), operation.defaultThinking);
    const issue = readStringArg(args, "issue")?.trim();
    const dryRun = readBooleanArg(args, "dry-run");

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
    if (ADVISORY_LANE_OPERATION_IDS.has(operation.id)) {
      promptLines.push(
        "",
        "Advisory-lane runtime profile:",
        "- Run directly from the current repository checkout; do not create a dedicated git worktree.",
        "- Do not run workspace bootstrap or delivery gates (`pnpm install`, `typecheck`, `lint`, `test*`, `build`, Docker preflights) unless a human explicitly overrides into code-writing mode.",
        "- Do not require a clean workspace for advisory runs.",
        "- Always append workflow memory for the run and execute `workflow-memory:sync`.",
        "- If `workflow-memory:sync` reports non-fast-forward updates, allow append-only auto-rebase retries.",
        "- If memory sync cannot complete due to non-memory conflicts, stop and report blocker details without changing non-memory files.",
      );
    }
    if (operation.id === "issue-evaluator") {
      promptLines.push(
        "",
        "Issue-evaluator label hygiene contract:",
        "- Ensure every evaluated issue has exactly one decision label among `ready-for-dev`, `human-eval-needed`, `rejected`.",
        "- If an issue carries both `ready-for-dev` and `human-eval-needed`, remove `human-eval-needed` when final decision is `ready-for-dev`.",
        "- For every issue that ends with `ready-for-dev`, ensure exactly one allowed `model:*` label and one allowed `thinking:*` label, even when decision label is unchanged.",
        "- If a `ready-for-dev` issue is missing routing labels, determine and apply the model/thinking pair in this run.",
        "- If final decision is not `ready-for-dev`, remove any `model:*` and `thinking:*` labels.",
        "- Prefer decision stability: do not demote already-`ready-for-dev` issues unless concrete new blocker evidence is identified.",
        "- Apply run-level approval caps to new promotions only; existing compliant `ready-for-dev` issues remain ready unless blocked.",
        "- Use deterministic final-state label writes (single `gh api ... issues/<number> -X PATCH -f labels[]=...` per issue) instead of long chained add/remove edits.",
      );
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
      config.cwd,
      "-",
    ];

    if (dryRun) {
      yield* cliConsole.log(`playbook: ${runner.playbookPath}`);
      yield* cliConsole.log(`command: codex ${codexArgs.join(" ")}`);
      yield* cliConsole.log("");
      yield* cliConsole.log("prompt:");
      yield* cliConsole.log(prompt);
      return 0;
    }

    const result = yield* processService.runStreaming("codex", codexArgs, {
      cwd: config.cwd,
      input: prompt,
      allowFailure: true,
      timeoutMs: CODEX_PLAYBOOK_TIMEOUT_MS,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExternalToolError({
            reason: `Failed to run codex playbook for ${operation.id}: ${unknownErrorMessage(error)}`,
          }),
      ),
    );

    return result.status;
  });

const runReadyForDevRouter = (
  operation: Operation,
  args: OperationRunArgs,
): Effect.Effect<number, OperationExecutionError, OperationExecutionEnv> =>
  Effect.gen(function* () {
    const processService = yield* CliProcess;
    const config = yield* CliConfig;
    const cliConsole = yield* CliConsole;
    const runner = operation.runner;

    if (runner.type !== "ready-for-dev-router") {
      return yield* Effect.fail(
        new PolicyViolationError({
          reason: `Operation ${operation.id} is not configured for ready-for-dev-router runner.`,
        }),
      );
    }

    const explicitIssue = readStringArg(args, "issue");
    const dryRun = readBooleanArg(args, "dry-run");
    let candidates = yield* listReadyForDevCandidates(explicitIssue);
    if (candidates.length === 0 && !explicitIssue && !dryRun) {
      yield* cliConsole.log(
        "No open issues with label ready-for-dev. Running issue-evaluator once to refresh labels.",
      );
      const refreshStatus = yield* runCodexPlaybook(ISSUE_EVALUATOR_FALLBACK_OPERATION, {});
      if (refreshStatus !== 0) {
        return yield* Effect.fail(
          new ExternalToolError({
            reason: `Issue-evaluator refresh failed with status ${refreshStatus}.`,
          }),
        );
      }
      candidates = yield* listReadyForDevCandidates(undefined);
    }

    if (candidates.length === 0) {
      if (explicitIssue) {
        yield* cliConsole.log(
          `No open issues with label ready-for-dev matching --issue ${explicitIssue}.`,
        );
      } else {
        yield* cliConsole.log("No open issues with label ready-for-dev.");
      }
      return 0;
    }

    const modelOverride = yield* readOptionalModelOverride(readStringArg(args, "model"));
    const thinkingOverride = yield* readOptionalThinkingOverride(readStringArg(args, "thinking"));

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
      "{\"selectedIssues\":[<issue numbers>],\"model\":\"<model id>\",\"thinking\":\"<thinking level>\",\"rationale\":\"<short reason>\"}",
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
      config.cwd,
      "-",
    ];

    if (dryRun) {
      if (modelOverride) {
        yield* cliConsole.log(`Execution model override: ${modelOverride}`);
      }
      if (thinkingOverride) {
        yield* cliConsole.log(`Execution thinking override: ${thinkingOverride}`);
      }
      yield* cliConsole.log(`Planner candidates: ${candidates.length}`);
      yield* cliConsole.log("Planner dry run command:");
      yield* cliConsole.log(`  codex ${plannerArgs.join(" ")}`);
      yield* cliConsole.log("");
      yield* cliConsole.log("Execution dry run command template:");
      yield* cliConsole.log(
        `  codex exec ${CODEX_DANGEROUS_FLAG} -m <model-from-planner> -c model_reasoning_effort="<thinking-from-planner>" -C ${config.cwd} -`,
      );
      return 0;
    }

    const plannerResult = yield* processService.run("codex", plannerArgs, {
      cwd: config.cwd,
      input: plannerPrompt,
      allowFailure: true,
      timeoutMs: READY_FOR_DEV_PLANNER_TIMEOUT_MS,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExternalToolError({
            reason: `Ready-for-dev planner call failed: ${unknownErrorMessage(error)}`,
          }),
      ),
    );
    if (plannerResult.status !== 0) {
      const details = (plannerResult.stderr || plannerResult.stdout || "").trim();
      return yield* Effect.fail(
        new ExternalToolError({
          reason: `Ready-for-dev planner call failed. ${details}`,
        }),
      );
    }

    const plan = yield* parseReadyForDevPlan(plannerResult.stdout || "");
    const candidateMap = new Map<number, GhIssueCandidate>(candidates.map((issue) => [issue.number, issue]));
    const selectedIssues: GhIssueCandidate[] = [];

    for (const issueNumber of plan.selectedIssues) {
      const issue = candidateMap.get(issueNumber);
      if (!issue) {
        return yield* Effect.fail(
          new PolicyViolationError({
            reason: `Planner selected issue #${issueNumber}, which is not in candidate set.`,
          }),
        );
      }
      selectedIssues.push(issue);
    }

    const model = yield* (modelOverride
      ? Effect.succeed(modelOverride)
      : ensureModel(plan.model, ""));
    const thinking = yield* (thinkingOverride
      ? Effect.succeed(thinkingOverride)
      : ensureThinking(plan.thinking, ""));
    yield* ensureIssueRoutingCompatibility(selectedIssues, model, thinking);

    for (const selected of selectedIssues) {
      const issueView = yield* runGhJson<GhIssueView>(
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
        return yield* Effect.fail(
          new PolicyViolationError({
            reason: `Issue #${selected.number} is no longer open (state=${issueView.state}).`,
          }),
        );
      }
      const hasReadyLabel = issueView.labels.some((label) => label.name === "ready-for-dev");
      if (!hasReadyLabel) {
        return yield* Effect.fail(
          new PolicyViolationError({
            reason: `Issue #${selected.number} no longer has ready-for-dev label.`,
          }),
        );
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
      "- Do not add additional unlisted product issues to scope in this run.",
      "- Prerequisite unblockers are allowed only when a required gate is blocked by a pre-existing regression; keep unblockers minimal and explicitly document them.",
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
      config.cwd,
      "-",
    ];

    yield* cliConsole.log(`Planner selected ${selectedIssues.length} issue(s).`);
    for (const issue of selectedIssues) {
      yield* cliConsole.log(`  - #${issue.number}: ${issue.title}`);
    }
    yield* cliConsole.log(`  model:    ${model}`);
    yield* cliConsole.log(`  thinking: ${thinking}`);

    const result = yield* processService.runStreaming("codex", codexArgs, {
      cwd: config.cwd,
      input: prompt,
      allowFailure: true,
      timeoutMs: READY_FOR_DEV_EXECUTOR_TIMEOUT_MS,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExternalToolError({
            reason: `Failed to execute ready-for-dev bundle: ${unknownErrorMessage(error)}`,
          }),
      ),
    );

    return result.status;
  });

export const runOperation = (
  input: OperationRunInput,
): Effect.Effect<number, OperationExecutionError, OperationExecutionEnv> => {
  if (input.operation.runner.type === "ready-for-dev-router") {
    return runReadyForDevRouter(input.operation, input.args);
  }

  if (input.operation.runner.type === "codex-playbook") {
    return runCodexPlaybook(input.operation, input.args);
  }

  return Effect.fail(
    new PolicyViolationError({
      reason: `Unsupported runner type for operation ${input.operation.id}.`,
    }),
  );
};
