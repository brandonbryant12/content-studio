import {
  runScriptGuardrailsLint,
} from "../guardrails/lint-scripts";
import { Effect } from "effect";
import {
  runWorkflowMemoryPreflight,
  type WorkflowMemoryPreflightOptions,
} from "../guardrails/workflow-memory-preflight";
import { runSkillsCheck, type SkillsCheckOptions } from "../skills/check-quality";
import { runSpecGenerate } from "../spec/generate";
import {
  runWorkflowMemoryAddEntry,
  type WorkflowMemoryAddEntryOptions,
} from "../workflow-memory/add-entry";
import {
  runWorkflowMemoryCoverage,
  type WorkflowMemoryCoverageOptions,
} from "../workflow-memory/check-coverage";
import {
  runWorkflowMemoryCompact,
  type WorkflowMemoryCompactOptions,
} from "../workflow-memory/compact-memory";
import {
  runWorkflowMemoryRetrieve,
  type WorkflowMemoryRetrieveOptions,
} from "../workflow-memory/retrieve";
import {
  runWorkflowMemoryValidateScenarios,
  type WorkflowMemoryValidateScenariosOptions,
} from "../workflow-memory/replay-scenarios";
import {
  runWorkflowMemorySync,
  type WorkflowMemorySyncOptions,
} from "../workflow-memory/sync-git";
import { runWorkflowsGenerate } from "../workflows/generate-readme";
import { WorkflowMemoryError } from "./cli-errors";

export type UtilityCommand =
  | {
      key: "skills:check";
      input: SkillsCheckOptions;
    }
  | {
      key: "workflows:generate";
    }
  | {
      key: "workflow-memory:add-entry";
      input: WorkflowMemoryAddEntryOptions;
    }
  | {
      key: "workflow-memory:preflight";
      input: WorkflowMemoryPreflightOptions;
    }
  | {
      key: "workflow-memory:sync";
      input: WorkflowMemorySyncOptions;
    }
  | {
      key: "workflow-memory:retrieve";
      input: WorkflowMemoryRetrieveOptions;
    }
  | {
      key: "workflow-memory:compact";
      input: WorkflowMemoryCompactOptions;
    }
  | {
      key: "workflow-memory:coverage";
      input: WorkflowMemoryCoverageOptions;
    }
  | {
      key: "workflow-memory:validate-scenarios";
      input: WorkflowMemoryValidateScenariosOptions;
    }
  | {
      key: "scripts:lint";
    }
  | {
      key: "spec:generate";
    };

export const runUtilityCommandEffect = (
  command: UtilityCommand,
): Effect.Effect<number, WorkflowMemoryError> => {
  switch (command.key) {
    case "skills:check":
      return runSkillsCheck(command.input).pipe(
        Effect.mapError(
          (error) =>
            new WorkflowMemoryError({
              command: command.key,
              reason: error.message,
            }),
        ),
      );
    case "workflows:generate":
      return runWorkflowsGenerate().pipe(
        Effect.mapError(
          (error) =>
            new WorkflowMemoryError({
              command: command.key,
              reason: error.message,
            }),
        ),
      );
    case "workflow-memory:add-entry":
      return runWorkflowMemoryAddEntry(command.input);
    case "workflow-memory:preflight":
      return runWorkflowMemoryPreflight(command.input).pipe(
        Effect.mapError(
          (error) =>
            new WorkflowMemoryError({
              command: command.key,
              reason: error.message,
            }),
        ),
      );
    case "workflow-memory:sync":
      return runWorkflowMemorySync(command.input);
    case "workflow-memory:retrieve":
      return runWorkflowMemoryRetrieve(command.input);
    case "workflow-memory:compact":
      return runWorkflowMemoryCompact(command.input);
    case "workflow-memory:coverage":
      return runWorkflowMemoryCoverage(command.input);
    case "workflow-memory:validate-scenarios":
      return runWorkflowMemoryValidateScenarios(command.input);
    case "scripts:lint":
      return runScriptGuardrailsLint().pipe(
        Effect.mapError(
          (error) =>
            new WorkflowMemoryError({
              command: command.key,
              reason: error.message,
            }),
        ),
      );
    case "spec:generate":
      return runSpecGenerate().pipe(
        Effect.mapError(
          (error) =>
            new WorkflowMemoryError({
              command: command.key,
              reason: error.message,
            }),
        ),
      );
  }
};
