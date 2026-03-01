import { promises as fs } from "node:fs";
import { RegistryLookupError } from "./errors";
import {
  OPERATIONS_PATH,
  type Operation,
} from "./control-plane-types";

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

export const readOperations = async (): Promise<Operation[]> => {
  const parsed = await readJson<{ operations: Operation[] }>(OPERATIONS_PATH);
  return parsed.operations;
};

export const getOperationOrThrow = async (operationId: string): Promise<Operation> => {
  const operations = await readOperations();
  const operation = operations.find((entry) => entry.id === operationId);
  if (!operation) {
    throw new RegistryLookupError({ entity: "operation", id: operationId });
  }
  return operation;
};

export const listOperations = async (json: boolean): Promise<void> => {
  const operations = await readOperations();
  if (json) {
    console.log(JSON.stringify(operations, null, 2));
    return;
  }

  console.log("Operations");
  for (const operation of operations) {
    const args = operation.args.map((arg) => `--${arg.name}`).join(", ");
    console.log(
      `- ${operation.id} (${operation.name}) | strategy=${operation.strategy} | default=${operation.defaultModel}/${operation.defaultThinking}`,
    );
    console.log(`  description: ${operation.description}`);
    console.log(`  args: ${args || "(none)"}`);
  }
};

export const explainOperation = async (operationId: string, json: boolean): Promise<void> => {
  const operation = await getOperationOrThrow(operationId);

  if (json) {
    console.log(JSON.stringify({ operation }, null, 2));
    return;
  }

  console.log(`Operation ${operation.id}`);
  console.log(`  name: ${operation.name}`);
  console.log(`  purpose: ${operation.description}`);
  console.log(`  strategy: ${operation.strategy}`);
  console.log(`  defaults: ${operation.defaultModel}/${operation.defaultThinking}`);
  console.log(`  runner: ${operation.runner.type}`);
  console.log(`  playbook: ${operation.runner.playbookPath}`);

  if (operation.args.length === 0) {
    console.log("  args: (none)");
  } else {
    console.log("  args:");
    for (const arg of operation.args) {
      const required = arg.required ? "required" : "optional";
      console.log(`    --${arg.name} (${arg.type}, ${required})`);
      console.log(`      ${arg.description}`);
    }
  }
};
