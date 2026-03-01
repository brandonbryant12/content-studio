import { Data } from "effect";

const UNKNOWN_ERROR = "Unknown error";

export class CliInputError extends Data.TaggedError("CliInputError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class RegistryValidationError extends Data.TaggedError("RegistryValidationError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class OperationLookupError extends Data.TaggedError("OperationLookupError")<{
  operationId: string;
}> {
  get message(): string {
    return `Unknown operation: ${this.operationId}`;
  }
}

export class ExternalToolError extends Data.TaggedError("ExternalToolError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export class WorkflowMemoryError extends Data.TaggedError("WorkflowMemoryError")<{
  command: string;
  reason: string;
}> {
  get message(): string {
    return `${this.command} failed: ${this.reason}`;
  }
}

export class PolicyViolationError extends Data.TaggedError("PolicyViolationError")<{
  reason: string;
}> {
  get message(): string {
    return this.reason;
  }
}

export type CliDomainError =
  | CliInputError
  | RegistryValidationError
  | OperationLookupError
  | ExternalToolError
  | WorkflowMemoryError
  | PolicyViolationError;

const TAGGED_EXIT_CODES: Record<CliDomainError["_tag"], number> = {
  CliInputError: 2,
  RegistryValidationError: 3,
  OperationLookupError: 4,
  ExternalToolError: 5,
  WorkflowMemoryError: 6,
  PolicyViolationError: 7,
};

export const unknownErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message.length > 0) {
      return message;
    }
  }

  return UNKNOWN_ERROR;
};

const isTaggedCliError = (error: unknown): error is CliDomainError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  typeof (error as { _tag?: unknown })._tag === "string" &&
  (error as { _tag: string })._tag in TAGGED_EXIT_CODES;

export const getCliExitCode = (error: unknown): number => {
  if (!isTaggedCliError(error)) {
    return 1;
  }

  return TAGGED_EXIT_CODES[error._tag];
};

