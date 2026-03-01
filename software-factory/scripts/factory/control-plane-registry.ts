import path from "node:path";
import Ajv from "ajv";
import { Context, Effect, Layer } from "effect";
import {
  CliInputError,
  OperationLookupError,
  RegistryValidationError,
  unknownErrorMessage,
} from "./cli-errors";
import { CliConfig, CliConsole, CliFileSystem } from "./cli-services";
import {
  type Operation,
  type Runner,
} from "./control-plane-types";

type OperationRegistryDocument = {
  version: number;
  operations: Operation[];
};

export class OperationRegistry extends Context.Tag("software-factory/OperationRegistry")<
  OperationRegistry,
  {
    readonly all: readonly Operation[];
    readonly getById: (operationId: string) => Effect.Effect<Operation, OperationLookupError>;
  }
>() {}

const formatAjvErrors = (errors: readonly { instancePath?: string; message?: string }[]): string => {
  if (errors.length === 0) {
    return "unknown schema validation error";
  }

  return errors
    .map((error) => {
      const instancePath = error.instancePath?.trim() || "/";
      const message = error.message?.trim() || "invalid";
      return `${instancePath} ${message}`;
    })
    .join("; ");
};

const readTextFile = (filePath: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* CliFileSystem;
    const raw = yield* fileSystem.readFile(filePath).pipe(
      Effect.mapError(
        (error) =>
          new RegistryValidationError({
            reason: `Failed to read ${filePath}: ${unknownErrorMessage(error)}`,
          }),
      ),
    );
    return raw;
  });

const parseJson = <T>(source: string, filePath: string) =>
  Effect.try({
    try: () => JSON.parse(source) as T,
    catch: (error) =>
      new RegistryValidationError({
        reason: `Invalid JSON in ${filePath}: ${unknownErrorMessage(error)}`,
      }),
  });

const validateSchema = (
  schema: unknown,
  document: unknown,
): Effect.Effect<OperationRegistryDocument, RegistryValidationError> =>
  Effect.try({
    try: () => {
      const validator = new Ajv({ allErrors: true }).compile(schema);
      if (!validator(document)) {
        throw new RegistryValidationError({
          reason: `Operation registry failed schema validation: ${formatAjvErrors(validator.errors ?? [])}`,
        });
      }
      return document as OperationRegistryDocument;
    },
    catch: (error) => {
      if (error instanceof RegistryValidationError) {
        return error;
      }

      return new RegistryValidationError({
        reason: `Operation schema validation failed: ${unknownErrorMessage(error)}`,
      });
    },
  });

const ensureRunnerType = (runner: Runner, operationId: string): Effect.Effect<void, RegistryValidationError> => {
  if (runner.type === "codex-playbook" || runner.type === "ready-for-dev-router") {
    return Effect.void;
  }

  return Effect.fail(
    new RegistryValidationError({
      reason: `Operation ${operationId} has unsupported runner type '${String((runner as { type?: unknown }).type)}'.`,
    }),
  );
};

const ensureOperationArgs = (
  operation: Operation,
): Effect.Effect<void, RegistryValidationError> => {
  const seen = new Set<string>();

  for (const arg of operation.args) {
    if (seen.has(arg.name)) {
      return Effect.fail(
        new RegistryValidationError({
          reason: `Operation ${operation.id} has duplicate arg '${arg.name}'.`,
        }),
      );
    }
    seen.add(arg.name);

    if (!arg.name.trim()) {
      return Effect.fail(
        new RegistryValidationError({
          reason: `Operation ${operation.id} has an arg with empty name.`,
        }),
      );
    }

    if (!["string", "number", "boolean"].includes(arg.type)) {
      return Effect.fail(
        new RegistryValidationError({
          reason: `Operation ${operation.id} arg '${arg.name}' has invalid type '${arg.type}'.`,
        }),
      );
    }

    if (arg.type === "boolean" && arg.required) {
      return Effect.fail(
        new RegistryValidationError({
          reason: `Operation ${operation.id} arg '${arg.name}' cannot be required when type=boolean.`,
        }),
      );
    }
  }

  return Effect.void;
};

const ensurePlaybookExists = (
  operation: Operation,
): Effect.Effect<void, RegistryValidationError, CliFileSystem | CliConfig> =>
  Effect.gen(function* () {
    const fileSystem = yield* CliFileSystem;
    const config = yield* CliConfig;
    const playbookPath = path.join(config.cwd, operation.runner.playbookPath);

    yield* fileSystem.access(playbookPath).pipe(
      Effect.mapError(
        () =>
          new RegistryValidationError({
            reason: `Operation ${operation.id} references missing playbook: ${operation.runner.playbookPath}`,
          }),
      ),
    );
  });

const ensureOperationInvariants = (
  operations: readonly Operation[],
): Effect.Effect<void, RegistryValidationError, CliFileSystem | CliConfig> =>
  Effect.gen(function* () {
    const operationIds = new Set<string>();

    for (const operation of operations) {
      if (operationIds.has(operation.id)) {
        return yield* Effect.fail(
          new RegistryValidationError({
            reason: `Duplicate operation id '${operation.id}' in registry.`,
          }),
        );
      }
      operationIds.add(operation.id);

      yield* ensureRunnerType(operation.runner, operation.id);
      yield* ensureOperationArgs(operation);
      yield* ensurePlaybookExists(operation);
    }
  });

export const loadOperationRegistry = (): Effect.Effect<
  readonly Operation[],
  RegistryValidationError,
  CliFileSystem | CliConfig
> =>
  Effect.gen(function* () {
    const config = yield* CliConfig;
    const [registryRaw, schemaRaw] = yield* Effect.all([
      readTextFile(config.operationsPath),
      readTextFile(config.operationsSchemaPath),
    ]);

    const registryJson = yield* parseJson<unknown>(registryRaw, config.operationsPath);
    const schemaJson = yield* parseJson<unknown>(schemaRaw, config.operationsSchemaPath);

    const parsed = yield* validateSchema(schemaJson, registryJson);
    const operations = parsed.operations;
    yield* ensureOperationInvariants(operations);

    return operations;
  });

export const OperationRegistryLive = Layer.effect(
  OperationRegistry,
  Effect.gen(function* () {
    const operations = yield* loadOperationRegistry();

    return {
      all: operations,
      getById: (operationId: string) => {
        const found = operations.find((operation) => operation.id === operationId);
        if (!found) {
          return Effect.fail(new OperationLookupError({ operationId }));
        }
        return Effect.succeed(found);
      },
    };
  }),
);

export const listOperations = (json: boolean): Effect.Effect<number, never, OperationRegistry | CliConsole> =>
  Effect.gen(function* () {
    const registry = yield* OperationRegistry;
    const cliConsole = yield* CliConsole;

    if (json) {
      yield* cliConsole.log(JSON.stringify(registry.all, null, 2));
      return 0;
    }

    yield* cliConsole.log("Operations");
    for (const operation of registry.all) {
      const args = operation.args.map((arg) => `--${arg.name}`).join(", ");
      yield* cliConsole.log(
        `- ${operation.id} (${operation.name}) | strategy=${operation.strategy} | default=${operation.defaultModel}/${operation.defaultThinking}`,
      );
      yield* cliConsole.log(`  description: ${operation.description}`);
      yield* cliConsole.log(`  args: ${args || "(none)"}`);
    }

    return 0;
  });

export const explainOperation = (
  operationId: string,
  json: boolean,
): Effect.Effect<number, OperationLookupError, OperationRegistry | CliConsole> =>
  Effect.gen(function* () {
    const registry = yield* OperationRegistry;
    const cliConsole = yield* CliConsole;
    const operation = yield* registry.getById(operationId);

    if (json) {
      yield* cliConsole.log(JSON.stringify({ operation }, null, 2));
      return 0;
    }

    yield* cliConsole.log(`Operation ${operation.id}`);
    yield* cliConsole.log(`  name: ${operation.name}`);
    yield* cliConsole.log(`  purpose: ${operation.description}`);
    yield* cliConsole.log(`  strategy: ${operation.strategy}`);
    yield* cliConsole.log(`  defaults: ${operation.defaultModel}/${operation.defaultThinking}`);
    yield* cliConsole.log(`  runner: ${operation.runner.type}`);
    yield* cliConsole.log(`  playbook: ${operation.runner.playbookPath}`);

    if (operation.args.length === 0) {
      yield* cliConsole.log("  args: (none)");
      return 0;
    }

    yield* cliConsole.log("  args:");
    for (const arg of operation.args) {
      const required = arg.required ? "required" : "optional";
      yield* cliConsole.log(`    --${arg.name} (${arg.type}, ${required})`);
      yield* cliConsole.log(`      ${arg.description}`);
    }

    return 0;
  });

export const assertTopLevelCommand = (
  command: string | undefined,
  allowedCommands: ReadonlySet<string>,
): Effect.Effect<void, CliInputError> => {
  if (!command || command.startsWith("-") || allowedCommands.has(command)) {
    return Effect.void;
  }

  return Effect.fail(
    new CliInputError({
      reason: `Unknown command: ${command}. Run 'pnpm software-factory --help' for available commands.`,
    }),
  );
};
