#!/usr/bin/env node

import path from "node:path";
import { Command, Options } from "@effect/cli";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import * as Option from "effect/Option";
import {
  CliInputError,
  OperationLookupError,
  getCliExitCode,
  unknownErrorMessage,
} from "./cli-errors";
import { runDoctor } from "./control-plane-doctor";
import { runOperation } from "./control-plane-execution";
import {
  OperationRegistry,
  OperationRegistryLive,
  assertTopLevelCommand,
  explainOperation,
  listOperations,
} from "./control-plane-registry";
import {
  type Operation,
  type OperationArg,
  type OperationRunArgs,
} from "./control-plane-types";
import {
  CliServicesLive,
} from "./cli-services";
import {
  runUtilityCommandEffect,
  type UtilityCommand,
} from "./utility-command-handlers";
import { UTILITY_USAGE_LINES } from "./utility-command-manifest";
import { runScript } from "../lib/effect-script";

const ROOT_COMMAND_NAMES = new Set([
  "skills",
  "workflows",
  "workflow-memory",
  "scripts",
  "spec",
  "operation",
  "doctor",
]);

const ROOT_DESCRIPTION = [
  "Software Factory execution control plane.",
  "Terms are strict: Operation -> Strategy -> Skills.",
  "Use --dry-run to print launch commands without executing codex.",
  "",
  "Quick start:",
  "1) Inspect operations: pnpm software-factory operation list",
  "2) Explain one operation: pnpm software-factory operation explain --operation-id <id>",
  "3) Run one operation: pnpm software-factory operation run <operation-id> [operation-options]",
  "",
  "Workflow-memory common tasks:",
  "- Add entry: pnpm software-factory workflow-memory add-entry --workflow <text> --title <text> ...",
  "- Retrieve entries: pnpm software-factory workflow-memory retrieve --workflow <name> [--limit <n>]",
  "- Coverage gate: pnpm software-factory workflow-memory coverage --strict",
  "",
  "Use subcommand help for details:",
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
  ["explain", "Describe one operation."],
  ["run", "Run one operation from generated descriptors."],
] as const;

const formatHelpRows = (rows: readonly (readonly [string, string])[]): string[] =>
  rows.map(([command, description]) => `  ${command}  ${description}`);

const printCompactRootHelp = (): void => {
  const lines = [
    "software-factory",
    "",
    "USAGE",
    "  pnpm software-factory <command> [options]",
    "",
    "START HERE",
    "  pnpm software-factory operation list",
    "  pnpm software-factory operation explain --operation-id <id>",
    "  pnpm software-factory operation run <operation-id> [operation-options]",
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
    "  pnpm software-factory operation explain --operation-id issue-evaluator",
    "  pnpm software-factory operation run issue-evaluator --dry-run",
  ];
  console.log(lines.join("\n"));
};

const printCompactOperationRunHelp = (operations: readonly Operation[]): void => {
  const operationIds = operations.map((operation) => operation.id).sort();
  const lines = [
    "software-factory operation run",
    "",
    "USAGE",
    "  pnpm software-factory operation run <operation-id> [operation-options]",
    "",
    "OPERATIONS",
    ...operationIds.map((id) => `  ${id}`),
    "",
    "EXAMPLES",
    "  pnpm software-factory operation run issue-evaluator --dry-run",
    "  pnpm software-factory operation run ready-for-dev-executor --issue 123 --model gpt-5.3-codex",
  ];
  console.log(lines.join("\n"));
};

const printCompactHelp = (argv: string[], operations: readonly Operation[]): boolean => {
  const args = argv.slice(2);
  const hasHelp = args.some((arg) => HELP_FLAGS.has(arg));
  if (!hasHelp) {
    return false;
  }

  const commandPath = args.filter((arg) => !arg.startsWith("-"));
  const [rootCommand, second] = commandPath;

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
  if (rootCommand === "operation" && second === "run" && commandPath.length === 2) {
    printCompactOperationRunHelp(operations);
    return true;
  }

  return false;
};

const optionToUndefined = <A>(value: Option.Option<A>): A | undefined =>
  Option.isSome(value) ? value.value : undefined;

const toOptionKey = (name: string): string => name.replaceAll("-", "_");

const toOperationRunArgs = (operation: Operation, input: Record<string, unknown>): OperationRunArgs => {
  const args: OperationRunArgs = {};

  for (const arg of operation.args) {
    const optionKey = toOptionKey(arg.name);
    const rawValue = input[optionKey];
    if (Option.isSome(rawValue as Option.Option<unknown>)) {
      args[arg.name] = (rawValue as Option.Some<unknown>).value as string | number | boolean;
      continue;
    }

    if (Option.isNone(rawValue as Option.Option<unknown>)) {
      continue;
    }

    if (rawValue !== undefined) {
      args[arg.name] = rawValue as string | number | boolean;
    }
  }

  return args;
};

const createOperationOption = (arg: OperationArg): any => {
  switch (arg.type) {
    case "string": {
      const base = Options.text(arg.name).pipe(Options.withDescription(arg.description));
      return arg.required ? base : base.pipe(Options.optional);
    }
    case "number": {
      const base = Options.float(arg.name).pipe(Options.withDescription(arg.description));
      return arg.required ? base : base.pipe(Options.optional);
    }
    case "boolean": {
      const base = Options.boolean(arg.name).pipe(Options.withDescription(arg.description));
      return arg.required ? base : base.pipe(Options.optional);
    }
  }
};

const buildDynamicOperationRunCommand = (
  operations: readonly Operation[],
): Command.Command<any, any, any> => {
  const operationCommands = operations.map((operation) => {
    const optionsShape = Object.fromEntries(
      operation.args.map((arg) => [toOptionKey(arg.name), createOperationOption(arg)]),
    );

    return Command.make(
      operation.id,
      optionsShape,
      (input: Record<string, unknown>) =>
        runOperation({
          operation,
          args: toOperationRunArgs(operation, input),
        }),
    ).pipe(
      Command.withDescription(operation.description),
    );
  });

  return Command.make("run", {}).pipe(
    Command.withDescription("Run one operation directly."),
    Command.withSubcommands(operationCommands as any),
  );
};

const validateOperationRunPath = (
  argv: string[],
  operations: readonly Operation[],
): Effect.Effect<void, CliInputError | OperationLookupError> => {
  const args = argv.slice(2);
  if (args.length < 2 || args[0] !== "operation" || args[1] !== "run") {
    return Effect.void;
  }
  if (args.some((arg) => HELP_FLAGS.has(arg))) {
    return Effect.void;
  }

  const operationId = args[2];
  if (!operationId || operationId.startsWith("-")) {
    return Effect.fail(
      new CliInputError({
        reason:
          "operation run requires an operation id subcommand. Usage: pnpm software-factory operation run <operation-id> [operation-options]",
      }),
    );
  }

  const operation = operations.find((entry) => entry.id === operationId);
  if (!operation) {
    return Effect.fail(
      new OperationLookupError({
        operationId,
      }),
    );
  }

  const allowedArgs = new Set(operation.args.map((arg) => arg.name));
  const rawArgs = args.slice(3);
  for (const token of rawArgs) {
    if (!token.startsWith("--")) {
      continue;
    }

    const flagName = token.slice(2).split("=")[0];
    if (!flagName || flagName === "help" || flagName === "h") {
      continue;
    }

    if (!allowedArgs.has(flagName)) {
      return Effect.fail(
        new CliInputError({
          reason: `Unknown argument --${flagName} for operation ${operation.id}.`,
        }),
      );
    }
  }

  return Effect.void;
};

const executeUtilityCommand = (command: UtilityCommand): Effect.Effect<number, unknown> =>
  runUtilityCommandEffect(command);

const jsonOption = Options.boolean("json").pipe(
  Options.withDescription("Print JSON output."),
);

const buildCli = (operations: readonly Operation[]) => {
  const operationIdOption = Options.text("operation-id").pipe(
    Options.withDescription("Registered operation id."),
  );
  const dryRunOption = Options.boolean("dry-run").pipe(
    Options.withDescription("Print launch command without executing codex."),
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
      executeUtilityCommand({ key: "skills:check", input: { strict, json } }),
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
          followUp: input.follow_up,
          owner: input.owner,
          status: input.status,
          id: optionToUndefined(input.id),
          date: optionToUndefined(input.date),
          severity: optionToUndefined(input.severity),
          tags: optionToUndefined(input.tags),
          reflection: optionToUndefined(input.reflection),
          feedback: optionToUndefined(input.feedback),
          memoryForm: optionToUndefined(input.memory_form),
          memoryFunction: optionToUndefined(input.memory_function),
          memoryDynamics: optionToUndefined(input.memory_dynamics),
          capability: optionToUndefined(input.capability),
          failureMode: optionToUndefined(input.failure_mode),
          importance: optionToUndefined(input.importance),
          recency: optionToUndefined(input.recency),
          confidence: optionToUndefined(input.confidence),
          source: optionToUndefined(input.source),
          scenarioSkill: optionToUndefined(input.scenario_skill),
          scenarioCheck: optionToUndefined(input.scenario_check),
          scenarioVerdict: optionToUndefined(input.scenario_verdict),
          scenarioPattern: optionToUndefined(input.scenario_pattern),
          scenarioSeverity: optionToUndefined(input.scenario_severity),
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
    ({ json }) => listOperations(json),
  ).pipe(Command.withDescription("List registered operations."));

  const operationExplainCommand = Command.make(
    "explain",
    {
      operation_id: operationIdOption,
      json: jsonOption,
    },
    ({ operation_id, json }) => explainOperation(operation_id, json),
  ).pipe(Command.withDescription("Describe one operation."));

  const operationRunCommand = buildDynamicOperationRunCommand(operations);

  const operationCommand = Command.make("operation", {}).pipe(
    Command.withDescription("Operation inspection and execution."),
    Command.withSubcommands([
      operationListCommand,
      operationExplainCommand,
      operationRunCommand,
    ]),
  );

  const doctorCommand = Command.make(
    "doctor",
    {},
    () => runDoctor(),
  ).pipe(Command.withDescription("Run software-factory environment diagnostics."));

  return Command.make("software-factory", {}).pipe(
    Command.withDescription(ROOT_DESCRIPTION),
    Command.withSubcommands([
      skillsCommand,
      workflowsCommand,
      workflowMemoryCommand,
      scriptsCommand,
      specCommand,
      operationCommand,
      doctorCommand,
    ]),
  );
};

const cliLayer = Layer.mergeAll(
  NodeContext.layer,
  CliServicesLive,
  OperationRegistryLive.pipe(Layer.provide(CliServicesLive)),
);

const runCli = (argv: string[]): Effect.Effect<number, unknown, OperationRegistry> =>
  Effect.gen(function* () {
    const args = argv.length <= 2 ? [...argv, "--help"] : argv;
    yield* assertTopLevelCommand(args[2], ROOT_COMMAND_NAMES);

    const registry = yield* OperationRegistry;
    const operations = registry.all;
    yield* validateOperationRunPath(args, operations);

    if (printCompactHelp(args, operations)) {
      return 0;
    }

    const app = Command.run(buildCli(operations), {
      name: "software-factory",
      version: "0.0.1",
    });

    return yield* app(args);
  });

const main = (): Promise<number> =>
  Effect.runPromise(
    runCli(process.argv).pipe(
      Effect.provide(cliLayer),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error(unknownErrorMessage(error));
          return getCliExitCode(error);
        }),
      ),
    ),
  );

runScript(main);
