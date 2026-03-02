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
