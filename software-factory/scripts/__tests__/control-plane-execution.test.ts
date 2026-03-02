import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import * as Either from "effect/Either";
import { runOperation } from "../factory/control-plane-execution";
import { CliConfig, CliConsole, CliProcess } from "../factory/cli-services";
import type { Operation } from "../factory/control-plane-types";

const READY_FOR_DEV_OPERATION: Operation = {
  id: "ready-for-dev-executor",
  name: "Ready-for-Dev Executor",
  description: "Test operation",
  defaultModel: "gpt-5.3-codex",
  defaultThinking: "high",
  strategy: "auto",
  args: [],
  runner: {
    type: "ready-for-dev-router",
    playbookPath: "automations/ready-for-dev-executor/ready-for-dev-executor.md",
  },
};

const ADVISORY_RESEARCH_OPERATION: Operation = {
  id: "best-practice-researcher",
  name: "Best Practice Researcher",
  description: "Test operation",
  defaultModel: "gpt-5.3-codex",
  defaultThinking: "high",
  strategy: "periodic-scans",
  args: [],
  runner: {
    type: "codex-playbook",
    playbookPath: "automations/best-practice-researcher/best-practice-researcher.md",
  },
};

const ISSUE_EVALUATOR_OPERATION: Operation = {
  id: "issue-evaluator",
  name: "Issue Evaluator",
  description: "Test operation",
  defaultModel: "gpt-5.3-codex",
  defaultThinking: "xhigh",
  strategy: "periodic-scans",
  args: [],
  labelingContext: {
    modelLabels: ["model:gpt-5.3-codex", "model:gpt-5.3-codex-spark"],
    thinkingLabels: ["thinking:low", "thinking:medium", "thinking:high", "thinking:xhigh"],
    decisionLabels: ["ready-for-dev", "human-eval-needed", "rejected"],
  },
  runner: {
    type: "codex-playbook",
    playbookPath: "automations/issue-evaluator/issue-evaluator.md",
  },
};

const NON_ADVISORY_CODEX_OPERATION: Operation = {
  id: "sanity-check",
  name: "Sanity Check",
  description: "Test operation",
  defaultModel: "gpt-5.3-codex",
  defaultThinking: "xhigh",
  strategy: "periodic-scans",
  args: [],
  runner: {
    type: "codex-playbook",
    playbookPath: "automations/sanity-check/sanity-check.md",
  },
};

describe("ready-for-dev router planner parsing", () => {
  it("accepts planner model/thinking values when returned as label-prefixed tokens", async () => {
    const streamedArgs: string[][] = [];
    const streamedInputs: string[] = [];
    const processLayer = Layer.succeed(CliProcess, {
      run: (command: string, args: string[]) =>
        Effect.sync(() => {
          if (
            command === "gh" &&
            args[0] === "issue" &&
            args[1] === "list"
          ) {
            return {
              status: 0,
              stdout: JSON.stringify([
                {
                  number: 42,
                  title: "Sample ready issue",
                  url: "https://github.com/example/repo/issues/42",
                  labels: [
                    { name: "ready-for-dev" },
                    { name: "model:gpt-5.3-codex-spark" },
                    { name: "thinking:medium" },
                  ],
                },
              ]),
              stderr: "",
            };
          }

          if (command === "codex" && args[0] === "exec") {
            return {
              status: 0,
              stdout:
                '{"selectedIssues":[42],"model":"model:gpt-5.3-codex-spark","thinking":"thinking:medium","rationale":"single issue"}',
              stderr: "",
            };
          }

          if (
            command === "gh" &&
            args[0] === "issue" &&
            args[1] === "view" &&
            args[2] === "42"
          ) {
            return {
              status: 0,
              stdout: JSON.stringify({
                number: 42,
                state: "OPEN",
                labels: [{ name: "ready-for-dev" }],
              }),
              stderr: "",
            };
          }

          throw new Error(`Unexpected run command: ${command} ${args.join(" ")}`);
        }),
      runStreaming: (command: string, args: string[], options) =>
        Effect.sync(() => {
          streamedArgs.push([command, ...args]);
          streamedInputs.push(options?.input ?? "");
          return { status: 0, stdout: "", stderr: "" };
        }),
    });

    const consoleLayer = Layer.succeed(CliConsole, {
      log: () => Effect.void,
      error: () => Effect.void,
    });

    const configLayer = Layer.succeed(CliConfig, {
      cwd: "/tmp/content-studio",
      operationsPath: "software-factory/operations/registry.json",
      operationsSchemaPath: "software-factory/operations/registry.schema.json",
    });

    const result = await Effect.runPromise(
      runOperation({
        operation: READY_FOR_DEV_OPERATION,
        args: {},
      }).pipe(
        Effect.provide(Layer.mergeAll(processLayer, consoleLayer, configLayer)),
        Effect.either,
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBe(0);
    }

    expect(streamedArgs.length).toBe(1);
    expect(streamedArgs[0]).toContain("gpt-5.3-codex-spark");
    expect(streamedArgs[0]).toContain('model_reasoning_effort="medium"');
    expect(streamedInputs[0]).toContain(
      "Prerequisite unblockers are allowed only when a required gate is blocked by a pre-existing regression",
    );
  });

  it("runs issue-evaluator once when no ready-for-dev candidates exist, then continues routing", async () => {
    let listCallCount = 0;
    const streamedInputs: string[] = [];
    const logLines: string[] = [];

    const processLayer = Layer.succeed(CliProcess, {
      run: (command: string, args: string[]) =>
        Effect.sync(() => {
          if (command === "gh" && args[0] === "issue" && args[1] === "list") {
            listCallCount += 1;
            if (listCallCount === 1) {
              return { status: 0, stdout: "[]", stderr: "" };
            }
            return {
              status: 0,
              stdout: JSON.stringify([
                {
                  number: 42,
                  title: "Sample ready issue",
                  url: "https://github.com/example/repo/issues/42",
                  labels: [{ name: "ready-for-dev" }],
                },
              ]),
              stderr: "",
            };
          }

          if (command === "codex" && args[0] === "exec") {
            return {
              status: 0,
              stdout:
                '{"selectedIssues":[42],"model":"gpt-5.3-codex","thinking":"high","rationale":"single issue"}',
              stderr: "",
            };
          }

          if (
            command === "gh" &&
            args[0] === "issue" &&
            args[1] === "view" &&
            args[2] === "42"
          ) {
            return {
              status: 0,
              stdout: JSON.stringify({
                number: 42,
                state: "OPEN",
                labels: [{ name: "ready-for-dev" }],
              }),
              stderr: "",
            };
          }

          throw new Error(`Unexpected run command: ${command} ${args.join(" ")}`);
        }),
      runStreaming: (_command: string, _args: string[], options) =>
        Effect.sync(() => {
          streamedInputs.push(options?.input ?? "");
          return { status: 0, stdout: "", stderr: "" };
        }),
    });

    const consoleLayer = Layer.succeed(CliConsole, {
      log: (message: string) =>
        Effect.sync(() => {
          logLines.push(message);
        }),
      error: () => Effect.void,
    });

    const configLayer = Layer.succeed(CliConfig, {
      cwd: "/tmp/content-studio",
      operationsPath: "software-factory/operations/registry.json",
      operationsSchemaPath: "software-factory/operations/registry.schema.json",
    });

    const result = await Effect.runPromise(
      runOperation({
        operation: READY_FOR_DEV_OPERATION,
        args: {},
      }).pipe(
        Effect.provide(Layer.mergeAll(processLayer, consoleLayer, configLayer)),
        Effect.either,
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBe(0);
    }

    expect(listCallCount).toBe(2);
    expect(streamedInputs.length).toBe(2);
    expect(streamedInputs[0]).toContain("Execute one full `issue-evaluator` run.");
    expect(streamedInputs[1]).toContain(
      "Execute one full `ready-for-dev-executor` run for the selected issue bundle only.",
    );
    expect(
      logLines.some((line) =>
        line.includes("Running issue-evaluator once to refresh labels"),
      ),
    ).toBe(true);
  });

  it("returns ExternalToolError when issue-evaluator refresh fails", async () => {
    const processLayer = Layer.succeed(CliProcess, {
      run: (command: string, args: string[]) =>
        Effect.sync(() => {
          if (command === "gh" && args[0] === "issue" && args[1] === "list") {
            return { status: 0, stdout: "[]", stderr: "" };
          }

          throw new Error(`Unexpected run command: ${command} ${args.join(" ")}`);
        }),
      runStreaming: () =>
        Effect.sync(() => ({ status: 23, stdout: "", stderr: "issue-evaluator failed" })),
    });

    const consoleLayer = Layer.succeed(CliConsole, {
      log: () => Effect.void,
      error: () => Effect.void,
    });

    const configLayer = Layer.succeed(CliConfig, {
      cwd: "/tmp/content-studio",
      operationsPath: "software-factory/operations/registry.json",
      operationsSchemaPath: "software-factory/operations/registry.schema.json",
    });

    const result = await Effect.runPromise(
      runOperation({
        operation: READY_FOR_DEV_OPERATION,
        args: {},
      }).pipe(
        Effect.provide(Layer.mergeAll(processLayer, consoleLayer, configLayer)),
        Effect.either,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("ExternalToolError");
      expect(result.left.reason).toBe("Issue-evaluator refresh failed with status 23.");
    }
  });
});

describe("codex-playbook advisory prompt profile", () => {
  it("injects advisory runtime constraints for researcher operations", async () => {
    const streamedInputs: string[] = [];

    const processLayer = Layer.succeed(CliProcess, {
      run: () =>
        Effect.sync(() => {
          throw new Error("Unexpected run invocation");
        }),
      runStreaming: (_command: string, _args: string[], options) =>
        Effect.sync(() => {
          streamedInputs.push(options?.input ?? "");
          return { status: 0, stdout: "", stderr: "" };
        }),
    });

    const consoleLayer = Layer.succeed(CliConsole, {
      log: () => Effect.void,
      error: () => Effect.void,
    });

    const configLayer = Layer.succeed(CliConfig, {
      cwd: "/tmp/content-studio",
      operationsPath: "software-factory/operations/registry.json",
      operationsSchemaPath: "software-factory/operations/registry.schema.json",
    });

    const result = await Effect.runPromise(
      runOperation({
        operation: ADVISORY_RESEARCH_OPERATION,
        args: {},
      }).pipe(
        Effect.provide(Layer.mergeAll(processLayer, consoleLayer, configLayer)),
        Effect.either,
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBe(0);
    }

    expect(streamedInputs).toHaveLength(1);
    expect(streamedInputs[0]).toContain("Advisory-lane runtime profile:");
    expect(streamedInputs[0]).toContain("do not create a dedicated git worktree");
    expect(streamedInputs[0]).toContain("Do not require a clean workspace for advisory runs.");
    expect(streamedInputs[0]).toContain("Always append workflow memory for the run");
  });

  it("does not inject advisory runtime constraints for non-advisory codex operations", async () => {
    const streamedInputs: string[] = [];

    const processLayer = Layer.succeed(CliProcess, {
      run: () =>
        Effect.sync(() => {
          throw new Error("Unexpected run invocation");
        }),
      runStreaming: (_command: string, _args: string[], options) =>
        Effect.sync(() => {
          streamedInputs.push(options?.input ?? "");
          return { status: 0, stdout: "", stderr: "" };
        }),
    });

    const consoleLayer = Layer.succeed(CliConsole, {
      log: () => Effect.void,
      error: () => Effect.void,
    });

    const configLayer = Layer.succeed(CliConfig, {
      cwd: "/tmp/content-studio",
      operationsPath: "software-factory/operations/registry.json",
      operationsSchemaPath: "software-factory/operations/registry.schema.json",
    });

    const result = await Effect.runPromise(
      runOperation({
        operation: NON_ADVISORY_CODEX_OPERATION,
        args: {},
      }).pipe(
        Effect.provide(Layer.mergeAll(processLayer, consoleLayer, configLayer)),
        Effect.either,
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBe(0);
    }

    expect(streamedInputs).toHaveLength(1);
    expect(streamedInputs[0]).not.toContain("Advisory-lane runtime profile:");
  });

  it("injects issue-evaluator label hygiene contract and xhigh defaults", async () => {
    const streamedInputs: string[] = [];
    const streamedArgs: string[][] = [];

    const processLayer = Layer.succeed(CliProcess, {
      run: () =>
        Effect.sync(() => {
          throw new Error("Unexpected run invocation");
        }),
      runStreaming: (command: string, args: string[], options) =>
        Effect.sync(() => {
          streamedArgs.push([command, ...args]);
          streamedInputs.push(options?.input ?? "");
          return { status: 0, stdout: "", stderr: "" };
        }),
    });

    const consoleLayer = Layer.succeed(CliConsole, {
      log: () => Effect.void,
      error: () => Effect.void,
    });

    const configLayer = Layer.succeed(CliConfig, {
      cwd: "/tmp/content-studio",
      operationsPath: "software-factory/operations/registry.json",
      operationsSchemaPath: "software-factory/operations/registry.schema.json",
    });

    const result = await Effect.runPromise(
      runOperation({
        operation: ISSUE_EVALUATOR_OPERATION,
        args: {},
      }).pipe(
        Effect.provide(Layer.mergeAll(processLayer, consoleLayer, configLayer)),
        Effect.either,
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBe(0);
    }

    expect(streamedArgs).toHaveLength(1);
    expect(streamedArgs[0]).toContain("gpt-5.3-codex");
    expect(streamedArgs[0]).toContain('model_reasoning_effort="xhigh"');
    expect(streamedInputs).toHaveLength(1);
    expect(streamedInputs[0]).toContain("Issue-evaluator label hygiene contract:");
    expect(streamedInputs[0]).toContain("remove `human-eval-needed`");
    expect(streamedInputs[0]).toContain("missing routing labels");
    expect(streamedInputs[0]).toContain("deterministic final-state label writes");
  });
});
