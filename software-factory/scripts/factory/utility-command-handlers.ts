import { main as lintScriptsMain } from "../guardrails/lint-scripts";
import { main as workflowMemoryPreflightMain } from "../guardrails/workflow-memory-preflight";
import { main as skillsCheckMain } from "../skills/check-quality";
import { main as specGenerateMain } from "../spec/generate";
import { main as addWorkflowMemoryEntryMain } from "../workflow-memory/add-entry";
import { main as checkWorkflowMemoryCoverageMain } from "../workflow-memory/check-coverage";
import { main as compactWorkflowMemoryMain } from "../workflow-memory/compact-memory";
import { main as retrieveWorkflowMemoryMain } from "../workflow-memory/retrieve";
import { main as replayScenariosMain } from "../workflow-memory/replay-scenarios";
import { main as syncWorkflowMemoryMain } from "../workflow-memory/sync-git";
import { main as generateWorkflowsReadmeMain } from "../workflows/generate-readme";
import { findUtilityCommandSpec, type UtilityCommandKey } from "./utility-command-manifest";

type UtilityMain = (argv?: string[]) => Promise<number>;

const UTILITY_HANDLERS: Record<UtilityCommandKey, UtilityMain> = {
  "skills:check": skillsCheckMain,
  "workflows:generate": generateWorkflowsReadmeMain,
  "workflow-memory:add-entry": addWorkflowMemoryEntryMain,
  "workflow-memory:preflight": workflowMemoryPreflightMain,
  "workflow-memory:sync": syncWorkflowMemoryMain,
  "workflow-memory:retrieve": retrieveWorkflowMemoryMain,
  "workflow-memory:compact": compactWorkflowMemoryMain,
  "workflow-memory:coverage": checkWorkflowMemoryCoverageMain,
  "scenario:validate": replayScenariosMain,
  "scripts:lint": lintScriptsMain,
  "spec:generate": specGenerateMain,
};

export const runUtilityCommand = async (
  domain: string,
  action: string | undefined,
  argv: string[],
): Promise<number | null> => {
  const command = findUtilityCommandSpec(domain, action);
  if (!command) {
    return null;
  }

  const handler = UTILITY_HANDLERS[command.key];
  if (!handler) {
    throw new Error(`Missing utility command handler for ${command.key}.`);
  }

  return await handler(argv);
};
