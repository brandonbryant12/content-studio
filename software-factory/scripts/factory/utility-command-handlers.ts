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
import { toUtilityCommandExecutionError } from "./errors";

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

const runUtilityCommandPromise = async (command: UtilityCommand): Promise<number> => {
  switch (command.key) {
    case "skills:check":
      return await runSkillsCheck(command.input);
    case "workflows:generate":
      return await runWorkflowsGenerate();
    case "workflow-memory:add-entry":
      return await runWorkflowMemoryAddEntry(command.input);
    case "workflow-memory:preflight":
      return await runWorkflowMemoryPreflight(command.input);
    case "workflow-memory:sync":
      return await runWorkflowMemorySync(command.input);
    case "workflow-memory:retrieve":
      return await runWorkflowMemoryRetrieve(command.input);
    case "workflow-memory:compact":
      return await runWorkflowMemoryCompact(command.input);
    case "workflow-memory:coverage":
      return await runWorkflowMemoryCoverage(command.input);
    case "workflow-memory:validate-scenarios":
      return await runWorkflowMemoryValidateScenarios(command.input);
    case "scripts:lint":
      return await runScriptGuardrailsLint();
    case "spec:generate":
      return await runSpecGenerate();
  }
};

export const runUtilityCommandEffect = (
  command: UtilityCommand,
): Effect.Effect<number, ReturnType<typeof toUtilityCommandExecutionError>> =>
  Effect.tryPromise({
    try: () => runUtilityCommandPromise(command),
    catch: (error) => toUtilityCommandExecutionError(command.key, error),
  });
