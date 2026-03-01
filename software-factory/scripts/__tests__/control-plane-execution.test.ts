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
      runStreaming: (command: string, args: string[]) =>
        Effect.sync(() => {
          streamedArgs.push([command, ...args]);
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
  });
});
