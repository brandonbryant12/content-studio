import path from "node:path";

export type Runner =
  | {
      type: "ready-for-dev-router";
      playbookPath: string;
    }
  | {
      type: "codex-playbook";
      playbookPath: string;
    };

export type OperationArg = {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
};

export type Operation = {
  id: string;
  name: string;
  description: string;
  defaultModel: string;
  defaultThinking: "low" | "medium" | "high" | "xhigh";
  strategy: string;
  args: OperationArg[];
  labelingContext?: {
    modelLabels?: string[];
    thinkingLabels?: string[];
    decisionLabels?: string[];
  };
  runner: Runner;
};

export type OperationRunOptions = {
  issue?: string;
  model?: string;
  thinking?: string;
  dryRun: boolean;
};

export type OperationRunInput = OperationRunOptions & {
  operationId: string;
};

export const OPERATIONS_PATH = path.join("software-factory", "operations", "registry.json");

export const VALID_THINKING = new Set(["low", "medium", "high", "xhigh"]);
export const VALID_MODELS = new Set(["gpt-5.3-codex", "gpt-5.3-codex-spark"]);

export const PLANNER_MODEL = "gpt-5.3-codex";
export const PLANNER_THINKING = "xhigh";
export const CODEX_DANGEROUS_FLAG = "--dangerously-bypass-approvals-and-sandbox";
