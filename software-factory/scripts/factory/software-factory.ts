#!/usr/bin/env node

import path from "node:path";
import { Command, Options } from "@effect/cli";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import * as Option from "effect/Option";
import {
  UnknownTopLevelCommandError,
  toCliExecutionError,
} from "./errors";
import { runDoctor } from "./control-plane-doctor";
import {
  type OperationRunInput,
  type TriggerFireInput,
} from "./control-plane-types";
import { fireTrigger, runOperation } from "./control-plane-execution";
import {
  explainOperation,
  explainTrigger,
  listOperations,
  listTriggers,
} from "./control-plane-registry";
import { runUtilityCommandEffect, type UtilityCommand } from "./utility-command-handlers";
import { UTILITY_USAGE_LINES } from "./utility-command-manifest";
import { runScript } from "../lib/effect-script";
const ROOT_COMMAND_NAMES = new Set([
  "skills",
  "workflows",
  "workflow-memory",
  "scripts",
  "spec",
  "operation",
  "trigger",
  "doctor",
]);
const ROOT_DESCRIPTION = [
  "Software Factory execution control plane.",
  "Terms are strict: Trigger -> Operation -> Strategy -> Skills.",
  "Use --dry-run to print launch commands without executing codex.",
  "",
  "Quick start:",
  "1) Inspect registered triggers: pnpm software-factory trigger list",
  "2) Explain one trigger: pnpm software-factory trigger explain --trigger-id <id>",
  "3) Fire one trigger: pnpm software-factory trigger fire --trigger-id <id> [--dry-run]",
  "4) Inspect operations: pnpm software-factory operation list",
  "5) Run one operation: pnpm software-factory operation run --operation-id <id> [--dry-run]",
  "",
  "Workflow-memory common tasks:",
  "- Add entry: pnpm software-factory workflow-memory add-entry --workflow <text> --title <text> ...",
  "- Retrieve entries: pnpm software-factory workflow-memory retrieve --workflow <name> [--limit <n>]",
  "- Coverage gate: pnpm software-factory workflow-memory coverage --strict",
  "- Validate scenarios: pnpm software-factory workflow-memory validate-scenarios --strict",
  "",
  "Use subcommand help for details:",
  "- pnpm software-factory trigger --help",
  "- pnpm software-factory operation --help",
  "- pnpm software-factory workflow-memory --help",
  "",
  "Utility command surfaces:",
  ...UTILITY_USAGE_LINES.map((line) => `- ${line}`),
].join("\n");
const HELP_FLAGS = new Set(["--help", "-h"]);
const ROOT_COMMAND_HELP_ROWS = [
  ["skills", "Skill quality and consistency tooling."],
  ["workflows", "Workflow catalog tooling."],
  ["workflow-memory", "Workflow-memory maintenance commands."],
  ["scripts", "Script quality commands."],
  ["spec", "Documentation specification commands."],
  ["operation", "Operation inspection and execution."],
  ["trigger", "Trigger inspection and execution."],
  ["doctor", "Run software-factory environment diagnostics."],
] as const;
const WORKFLOW_MEMORY_HELP_ROWS = [
  ["add-entry", "Append a workflow-memory event entry."],
  ["preflight", "Validate workflow-memory runtime prerequisites."],
  ["sync", "Commit and push append-only workflow-memory artifacts."],
  ["retrieve", "Retrieve ranked workflow-memory entries."],
  ["compact", "Compact workflow-memory events and rebuild index."],
  ["coverage", "Check monthly workflow-memory coverage."],
  ["validate-scenarios", "Validate workflow-memory replay scenarios."],
] as const;
const OPERATION_HELP_ROWS = [
  ["list", "List registered operations."],
  ["explain", "Describe one operation and linked triggers."],
  ["run", "Run one operation directly."],
] as const;
const TRIGGER_HELP_ROWS = [
  ["list", "List registered triggers."],
  ["explain", "Describe one trigger and linked operation."],
  ["fire", "Fire one trigger with optional overrides."],
] as const;

const formatHelpRows = (rows: readonly (readonly [string, string])[]): string[] => {
  return rows.map(([command, description]) => `  ${command}  ${description}`);
};

const printCompactRootHelp = (): void => {
  const lines = [
    "software-factory",
    "",
    "USAGE",
    "  pnpm software-factory <command> [options]",
    "",
    "START HERE",
    "  pnpm software-factory trigger list",
    "  pnpm software-factory trigger explain --trigger-id <id>",
    "  pnpm software-factory trigger fire --trigger-id <id> [--dry-run]",
    "",
    "COMMANDS",
    ...formatHelpRows(ROOT_COMMAND_HELP_ROWS),
    "",
    "UTILITY SHORTCUTS",
    "  pnpm software-factory workflow-memory coverage --strict",
    "  pnpm software-factory workflow-memory validate-scenarios --strict",
    "",
    "MORE",
    "  pnpm software-factory <command> --help",
  ];
  console.log(lines.join("\n"));
};

const printCompactWorkflowMemoryHelp = (): void => {
  const lines = [
    "software-factory workflow-memory",
    "",
    "USAGE",
    "  pnpm software-factory workflow-memory <command> [options]",
    "",
    "COMMANDS",
    ...formatHelpRows(WORKFLOW_MEMORY_HELP_ROWS),
    "",
    "EXAMPLES",
    "  pnpm software-factory workflow-memory retrieve --workflow \"Feature Delivery\" --limit 10",
    "  pnpm software-factory workflow-memory coverage --strict",
    "  pnpm software-factory workflow-memory validate-scenarios --strict",
  ];
  console.log(lines.join("\n"));
};

const printCompactOperationHelp = (): void => {
  const lines = [
    "software-factory operation",
    "",
    "USAGE",
    "  pnpm software-factory operation <command> [options]",
    "",
    "COMMANDS",
    ...formatHelpRows(OPERATION_HELP_ROWS),
    "",
    "EXAMPLES",
    "  pnpm software-factory operation list",
    "  pnpm software-factory operation explain --operation-id ready-for-dev-executor",
    "  pnpm software-factory operation run --operation-id ready-for-dev-executor --dry-run",
  ];
  console.log(lines.join("\n"));
};

const printCompactTriggerHelp = (): void => {
  const lines = [
    "software-factory trigger",
    "",
    "USAGE",
    "  pnpm software-factory trigger <command> [options]",
    "",
    "COMMANDS",
    ...formatHelpRows(TRIGGER_HELP_ROWS),
    "",
    "EXAMPLES",
    "  pnpm software-factory trigger list",
    "  pnpm software-factory trigger explain --trigger-id ready-for-dev-executor",
    "  pnpm software-factory trigger fire --trigger-id ready-for-dev-executor --dry-run",
  ];
  console.log(lines.join("\n"));
};

const printCompactHelp = (argv: string[]): boolean => {
  const args = argv.slice(2);
  const hasHelp = args.some((arg) => HELP_FLAGS.has(arg));
  if (!hasHelp) {
    return false;
  }

  const commandPath = args.filter((arg) => !arg.startsWith("-"));
  const [rootCommand] = commandPath;

  if (!rootCommand) {
    printCompactRootHelp();
    return true;
  }
  if (rootCommand === "workflow-memory" && commandPath.length === 1) {
    printCompactWorkflowMemoryHelp();
    return true;
  }
  if (rootCommand === "operation" && commandPath.length === 1) {
    printCompactOperationHelp();
    return true;
  }
  if (rootCommand === "trigger" && commandPath.length === 1) {
    printCompactTriggerHelp();
    return true;
  }

  return false;
};

const optionToUndefined = <A>(value: Option.Option<A>): A | undefined =>
  Option.isSome(value) ? value.value : undefined;

const applyExitCode = (status: number): void => {
  if (status !== 0) {
    process.exitCode = status;
  }
};

const executeUtilityCommand = (
  command: UtilityCommand,
): Effect.Effect<void, ReturnType<typeof toCliExecutionError>> =>
  runUtilityCommandEffect(command).pipe(
    Effect.tap((status) => Effect.sync(() => applyExitCode(status))),
    Effect.asVoid,
    Effect.mapError((error) =>
      toCliExecutionError(`utility command ${command.key}`, error),
    ),
  );

const executeOperationRun = (
  input: OperationRunInput,
): Effect.Effect<void, ReturnType<typeof toCliExecutionError>> =>
  Effect.tryPromise({
    try: async () => {
      const status = await runOperation(input);
      applyExitCode(status);
    },
    catch: (error) => toCliExecutionError("operation run", error),
  });

const executeTriggerFire = (
  input: TriggerFireInput,
): Effect.Effect<void, ReturnType<typeof toCliExecutionError>> =>
  Effect.tryPromise({
    try: async () => {
      const status = await fireTrigger(input);
      applyExitCode(status);
    },
    catch: (error) => toCliExecutionError("trigger fire", error),
  });

const executeDoctor = (): Effect.Effect<void, ReturnType<typeof toCliExecutionError>> =>
  Effect.tryPromise({
    try: async () => {
      const status = await runDoctor();
      applyExitCode(status);
    },
    catch: (error) => toCliExecutionError("doctor", error),
  });

const operationIdOption = Options.text("operation-id").pipe(
  Options.withDescription("Registered operation id."),
);
const triggerIdOption = Options.text("trigger-id").pipe(
  Options.withDescription("Registered trigger id."),
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
  ({ strict, json }) => executeUtilityCommand({ key: "skills:check", input: { strict, json } }),
).pipe(Command.withDescription("Validate skill metadata, contracts, and mirrors."));

const skillsCommand = Command.make("skills", {}).pipe(
  Command.withDescription("Skill quality and consistency tooling."),
  Command.withSubcommands([skillsCheckCommand]),
);

const workflowsGenerateCommand = Command.make(
  "generate",
  {},
  () => executeUtilityCommand({ key: "workflows:generate" }),
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
    executeUtilityCommand({
      key: "workflow-memory:add-entry",
      input: {
        workflow: input.workflow,
        title: input.title,
        trigger: input.trigger,
        finding: input.finding,
        evidence: input.evidence,
        follow_up: input.follow_up,
        owner: input.owner,
        status: input.status,
        id: optionToUndefined(input.id),
        date: optionToUndefined(input.date),
        severity: optionToUndefined(input.severity),
        tags: optionToUndefined(input.tags),
        reflection: optionToUndefined(input.reflection),
        feedback: optionToUndefined(input.feedback),
        memory_form: optionToUndefined(input.memory_form),
        memory_function: optionToUndefined(input.memory_function),
        memory_dynamics: optionToUndefined(input.memory_dynamics),
        capability: optionToUndefined(input.capability),
        failure_mode: optionToUndefined(input.failure_mode),
        importance: optionToUndefined(input.importance),
        recency: optionToUndefined(input.recency),
        confidence: optionToUndefined(input.confidence),
        source: optionToUndefined(input.source),
        scenario_skill: optionToUndefined(input.scenario_skill),
        scenario_check: optionToUndefined(input.scenario_check),
        scenario_verdict: optionToUndefined(input.scenario_verdict),
        scenario_pattern: optionToUndefined(input.scenario_pattern),
        scenario_severity: optionToUndefined(input.scenario_severity),
      },
    }),
).pipe(Command.withDescription("Append a workflow-memory event entry."));

const workflowMemoryPreflightCommand = Command.make(
  "preflight",
  {
    bootstrap: Options.boolean("bootstrap"),
    cwd: Options.text("cwd").pipe(
      Options.withDescription("Working directory to run runtime checks from."),
      Options.optional,
    ),
    memory_path: Options.text("memory-path").pipe(
      Options.withDescription("Override workflow-memory directory path."),
      Options.optional,
    ),
  },
  ({ bootstrap, cwd, memory_path }) =>
    executeUtilityCommand({
      key: "workflow-memory:preflight",
      input: {
        bootstrap,
        cwd: optionToUndefined(cwd) ?? process.cwd(),
        memoryPath:
          optionToUndefined(memory_path) ?? path.join("software-factory", "workflow-memory"),
      },
    }),
).pipe(Command.withDescription("Validate workflow-memory runtime prerequisites."));

const workflowMemorySyncCommand = Command.make(
  "sync",
  {
    remote: Options.text("remote").pipe(
      Options.withDescription("Git remote name (default: origin)."),
      Options.optional,
    ),
    branch: Options.text("branch").pipe(
      Options.withDescription("Target branch name (default: current branch)."),
      Options.optional,
    ),
    message: Options.text("message").pipe(
      Options.withDescription("Commit message for workflow-memory append artifacts."),
      Options.optional,
    ),
    max_attempts: Options.integer("max-attempts").pipe(
      Options.withDescription("Maximum push/rebase retry attempts."),
      Options.optional,
    ),
    dry_run: dryRunOption,
  },
  ({ remote, branch, message, max_attempts, dry_run }) =>
    executeUtilityCommand({
      key: "workflow-memory:sync",
      input: {
        remote: optionToUndefined(remote),
        branch: optionToUndefined(branch),
        message: optionToUndefined(message),
        maxAttempts: optionToUndefined(max_attempts),
        dryRun: dry_run,
      },
    }),
).pipe(Command.withDescription("Commit and push append-only workflow-memory artifacts."));

const workflowMemoryRetrieveCommand = Command.make(
  "retrieve",
  {
    workflow: Options.text("workflow").pipe(
      Options.withDescription("Filter by workflow key (for example: Feature Delivery)."),
      Options.optional,
    ),
    tags: Options.text("tags").pipe(
      Options.withDescription("CSV tag filter (all listed tags must match)."),
      Options.optional,
    ),
    limit: Options.integer("limit").pipe(
      Options.withDescription("Maximum results to return."),
      Options.optional,
    ),
    min_score: Options.float("min-score").pipe(
      Options.withDescription("Minimum ranking score threshold."),
      Options.optional,
    ),
    month: Options.text("month").pipe(
      Options.withDescription("Filter month in YYYY-MM format."),
      Options.optional,
    ),
    has_scenario: Options.boolean("has-scenario").pipe(
      Options.withDescription("Return only entries with attached scenario metadata."),
    ),
    scenario_skill: Options.text("scenario-skill").pipe(
      Options.withDescription("Filter by scenario target skill."),
      Options.optional,
    ),
  },
  ({ workflow, tags, limit, min_score, month, has_scenario, scenario_skill }) =>
    executeUtilityCommand({
      key: "workflow-memory:retrieve",
      input: {
        workflow: optionToUndefined(workflow),
        tags: optionToUndefined(tags),
        limit: optionToUndefined(limit),
        minScore: optionToUndefined(min_score),
        month: optionToUndefined(month),
        hasScenario: has_scenario,
        scenarioSkill: optionToUndefined(scenario_skill),
      },
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
    executeUtilityCommand({
      key: "workflow-memory:compact",
      input: {
        archiveClosed: archive_closed,
        days: optionToUndefined(days) ?? 90,
        dryRun: dry_run,
      },
    }),
).pipe(Command.withDescription("Compact workflow-memory events and rebuild index."));

const workflowMemoryCoverageCommand = Command.make(
  "coverage",
  {
    month: Options.text("month").pipe(
      Options.withDescription("Coverage month in YYYY-MM format (default: current month)."),
      Options.optional,
    ),
    min: Options.integer("min").pipe(
      Options.withDescription("Minimum entries required per workflow."),
      Options.optional,
    ),
    strict: Options.boolean("strict"),
    json: jsonOption,
    audit_taxonomy: Options.boolean("audit-taxonomy").pipe(
      Options.withDescription("Report missing required memory taxonomy tags."),
    ),
  },
  ({ month, min, strict, json, audit_taxonomy }) =>
    executeUtilityCommand({
      key: "workflow-memory:coverage",
      input: {
        month: optionToUndefined(month),
        min: optionToUndefined(min),
        strict,
        json,
        auditTaxonomy: audit_taxonomy,
      },
    }),
).pipe(Command.withDescription("Check monthly workflow-memory coverage."));

const workflowMemoryValidateScenariosCommand = Command.make(
  "validate-scenarios",
  {
    skill: Options.text("skill").pipe(
      Options.withDescription("Filter by scenario target skill."),
      Options.optional,
    ),
    check: Options.text("check").pipe(
      Options.withDescription("Filter by scenario check name."),
      Options.optional,
    ),
    id: Options.text("id").pipe(
      Options.withDescription("Validate one scenario by event id."),
      Options.optional,
    ),
    month: Options.text("month").pipe(
      Options.withDescription("Validate scenarios from one month (YYYY-MM)."),
      Options.optional,
    ),
    json: jsonOption,
    strict: Options.boolean("strict").pipe(
      Options.withDescription("Exit with code 1 on any validation failure."),
    ),
  },
  ({ skill, check, id, month, json, strict }) =>
    executeUtilityCommand({
      key: "workflow-memory:validate-scenarios",
      input: {
        skill: optionToUndefined(skill),
        check: optionToUndefined(check),
        id: optionToUndefined(id),
        month: optionToUndefined(month),
        json,
        strict,
      },
    }),
).pipe(Command.withDescription("Validate workflow-memory replay scenarios."));

const workflowMemoryCommand = Command.make("workflow-memory", {}).pipe(
  Command.withDescription("Workflow-memory maintenance commands."),
  Command.withSubcommands([
    workflowMemoryAddEntryCommand,
    workflowMemoryPreflightCommand,
    workflowMemorySyncCommand,
    workflowMemoryRetrieveCommand,
    workflowMemoryCompactCommand,
    workflowMemoryCoverageCommand,
    workflowMemoryValidateScenariosCommand,
  ]),
);

const scriptsLintCommand = Command.make(
  "lint",
  {},
  () => executeUtilityCommand({ key: "scripts:lint" }),
).pipe(Command.withDescription("Run software-factory script guardrails."));

const scriptsCommand = Command.make("scripts", {}).pipe(
  Command.withDescription("Script quality commands."),
  Command.withSubcommands([scriptsLintCommand]),
);

const specGenerateCommand = Command.make(
  "generate",
  {},
  () => executeUtilityCommand({ key: "spec:generate" }),
).pipe(Command.withDescription("Regenerate docs spec artifacts."));

const specCommand = Command.make("spec", {}).pipe(
  Command.withDescription("Documentation specification commands."),
  Command.withSubcommands([specGenerateCommand]),
);

const operationListCommand = Command.make(
  "list",
  { json: jsonOption },
  ({ json }) =>
    Effect.tryPromise({
      try: () => listOperations(json),
      catch: (error) => toCliExecutionError("operation list", error),
    }),
).pipe(Command.withDescription("List registered operations."));

const operationExplainCommand = Command.make(
  "explain",
  {
    operation_id: operationIdOption,
    json: jsonOption,
  },
  ({ operation_id, json }) =>
    Effect.tryPromise({
      try: () => explainOperation(operation_id, json),
      catch: (error) => toCliExecutionError("operation explain", error),
    }),
).pipe(Command.withDescription("Describe one operation and linked triggers."));

const operationRunCommand = Command.make(
  "run",
  {
    operation_id: operationIdOption,
    issue: issueOption,
    model: modelOption,
    thinking: thinkingOption,
    dry_run: dryRunOption,
  },
  ({ operation_id, issue, model, thinking, dry_run }) =>
    executeOperationRun({
      operationId: operation_id,
      issue: optionToUndefined(issue),
      model: optionToUndefined(model),
      thinking: optionToUndefined(thinking),
      dryRun: dry_run,
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
  ({ json }) =>
    Effect.tryPromise({
      try: () => listTriggers(json),
      catch: (error) => toCliExecutionError("trigger list", error),
    }),
).pipe(Command.withDescription("List registered triggers."));

const triggerExplainCommand = Command.make(
  "explain",
  {
    trigger_id: triggerIdOption,
    json: jsonOption,
  },
  ({ trigger_id, json }) =>
    Effect.tryPromise({
      try: () => explainTrigger(trigger_id, json),
      catch: (error) => toCliExecutionError("trigger explain", error),
    }),
).pipe(Command.withDescription("Describe one trigger and linked operation."));

const triggerFireCommand = Command.make(
  "fire",
  {
    trigger_id: triggerIdOption,
    issue: issueOption,
    model: modelOption,
    thinking: thinkingOption,
    dry_run: dryRunOption,
  },
  ({ trigger_id, issue, model, thinking, dry_run }) =>
    executeTriggerFire({
      triggerId: trigger_id,
      issue: optionToUndefined(issue),
      model: optionToUndefined(model),
      thinking: optionToUndefined(thinking),
      dryRun: dry_run,
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
  () => executeDoctor(),
).pipe(Command.withDescription("Run software-factory environment diagnostics."));

const cli = Command.make("software-factory", {}).pipe(
  Command.withDescription(ROOT_DESCRIPTION),
  Command.withSubcommands([
    skillsCommand,
    workflowsCommand,
    workflowMemoryCommand,
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

const validateTopLevelCommand = (argv: string[]): void => {
  const firstToken = argv[2];
  if (!firstToken || firstToken.startsWith("-")) {
    return;
  }

  if (!ROOT_COMMAND_NAMES.has(firstToken)) {
    throw new UnknownTopLevelCommandError({ command: firstToken });
  }
};

const main = async (): Promise<void> => {
  const args = process.argv.length <= 2 ? [...process.argv, "--help"] : process.argv;
  validateTopLevelCommand(args);
  if (printCompactHelp(args)) {
    return;
  }
  await Effect.runPromise(app(args).pipe(Effect.provide(NodeContext.layer)));
};

runScript(main);
