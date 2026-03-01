import { Data } from "effect";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class UnknownTopLevelCommandError extends Data.TaggedError("UnknownTopLevelCommandError")<{
  command: string;
}> {
  get message(): string {
    return `Unknown command: ${this.command}. Run 'pnpm software-factory --help' for available commands.`;
  }
}

export class CliInputError extends Data.TaggedError("CliInputError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class RegistryLookupError extends Data.TaggedError("RegistryLookupError")<{
  entity: "operation";
  id: string;
}> {
  get message(): string {
    return `Unknown ${this.entity}: ${this.id}`;
  }
}

export class RunnerConfigurationError extends Data.TaggedError("RunnerConfigurationError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class ExternalToolError extends Data.TaggedError("ExternalToolError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class PlannerOutputError extends Data.TaggedError("PlannerOutputError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class RoutingConstraintError extends Data.TaggedError("RoutingConstraintError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class UtilityCommandExecutionError extends Data.TaggedError("UtilityCommandExecutionError")<{
  command: string;
  reason: string;
}> {
  get message(): string {
    return `Utility command '${this.command}' failed: ${this.reason}`;
  }
}

export class CliExecutionError extends Data.TaggedError("CliExecutionError")<{
  operation: string;
  reason: string;
}> {
  get message(): string {
    return `${this.operation} failed: ${this.reason}`;
  }
}

export const toUtilityCommandExecutionError = (
  command: string,
  error: unknown,
): UtilityCommandExecutionError =>
  new UtilityCommandExecutionError({
    command,
    reason: errorMessage(error),
  });

export const toCliExecutionError = (
  operation: string,
  error: unknown,
): CliExecutionError =>
  new CliExecutionError({
    operation,
    reason: errorMessage(error),
  });
