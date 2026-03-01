import { promises as fs } from "node:fs";
import { RegistryLookupError } from "./errors";
import {
  OPERATIONS_PATH,
  TRIGGERS_PATH,
  type Operation,
  type Trigger,
} from "./control-plane-types";

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

export const readOperations = async (): Promise<Operation[]> => {
  const parsed = await readJson<{ operations: Operation[] }>(OPERATIONS_PATH);
  return parsed.operations;
};

export const readTriggers = async (): Promise<Trigger[]> => {
  const parsed = await readJson<{ triggers: Trigger[] }>(TRIGGERS_PATH);
  return parsed.triggers;
};

export const getOperationOrThrow = async (operationId: string): Promise<Operation> => {
  const operations = await readOperations();
  const operation = operations.find((entry) => entry.id === operationId);
  if (!operation) {
    throw new RegistryLookupError({ entity: "operation", id: operationId });
  }
  return operation;
};

export const getTriggerOrThrow = async (triggerId: string): Promise<Trigger> => {
  const triggers = await readTriggers();
  const trigger = triggers.find((entry) => entry.id === triggerId);
  if (!trigger) {
    throw new RegistryLookupError({ entity: "trigger", id: triggerId });
  }
  return trigger;
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
  const [operation, triggers] = await Promise.all([
    getOperationOrThrow(operationId),
    readTriggers(),
  ]);
  const linkedTriggers = triggers.filter((trigger) => trigger.operationId === operation.id);

  if (json) {
    console.log(JSON.stringify({ operation, triggers: linkedTriggers }, null, 2));
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

  if (linkedTriggers.length === 0) {
    console.log("  triggers: (none)");
    return;
  }

  console.log("  triggers:");
  for (const trigger of linkedTriggers) {
    console.log(`    - ${trigger.id} (${trigger.rrule})`);
  }
};

export const listTriggers = async (json: boolean): Promise<void> => {
  const triggers = await readTriggers();
  if (json) {
    console.log(JSON.stringify(triggers, null, 2));
    return;
  }

  console.log("Triggers");
  for (const trigger of triggers) {
    console.log(`- ${trigger.id} (${trigger.name}) -> ${trigger.operationId}`);
    console.log(`  schedule: ${trigger.rrule}`);
  }
};

export const explainTrigger = async (triggerId: string, json: boolean): Promise<void> => {
  const trigger = await getTriggerOrThrow(triggerId);
  const operation = await getOperationOrThrow(trigger.operationId);

  if (json) {
    console.log(JSON.stringify({ trigger, operation }, null, 2));
    return;
  }

  console.log(`Trigger ${trigger.id}`);
  console.log(`  name: ${trigger.name}`);
  console.log(`  schedule: ${trigger.rrule}`);
  console.log(`  operation: ${trigger.operationId}`);
  console.log(`  operation strategy: ${operation.strategy}`);
  console.log(`  operation defaults: ${operation.defaultModel}/${operation.defaultThinking}`);
  console.log(`  operation runner: ${operation.runner.type}`);
  if (Object.keys(trigger.args).length === 0) {
    console.log("  trigger args: (none)");
  } else {
    console.log("  trigger args:");
    for (const [key, value] of Object.entries(trigger.args)) {
      console.log(`    --${key}=${value}`);
    }
  }
};
