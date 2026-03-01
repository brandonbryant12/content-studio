import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import * as Either from "effect/Either";
import {
  CliInputError,
  ExternalToolError,
  OperationLookupError,
  PolicyViolationError,
  RegistryValidationError,
  WorkflowMemoryError,
  getCliExitCode,
} from "../factory/cli-errors";
import {
  loadOperationRegistry,
} from "../factory/control-plane-registry";
import { runUtilityCommandEffect } from "../factory/utility-command-handlers";
import { CliConfig, CliFileSystemLive } from "../factory/cli-services";

describe("factory error contracts", () => {
  it("maps tagged CLI errors to deterministic exit codes", () => {
    expect(getCliExitCode(new CliInputError({ reason: "bad input" }))).toBe(2);
    expect(getCliExitCode(new RegistryValidationError({ reason: "bad registry" }))).toBe(3);
    expect(getCliExitCode(new OperationLookupError({ operationId: "missing-op" }))).toBe(4);
    expect(getCliExitCode(new ExternalToolError({ reason: "tool failed" }))).toBe(5);
    expect(
      getCliExitCode(new WorkflowMemoryError({ command: "workflow-memory:coverage", reason: "bad month" })),
    ).toBe(6);
    expect(getCliExitCode(new PolicyViolationError({ reason: "policy" }))).toBe(7);
  });

  it("fails invalid operation registry schema with tagged error", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "sf-registry-"));
    const registryPath = path.join(tempDir, "registry.json");
    const schemaPath = path.join(tempDir, "schema.json");
    try {
      await writeFile(
        schemaPath,
        JSON.stringify(
          {
            type: "object",
            additionalProperties: false,
            required: ["version", "operations"],
            properties: {
              version: { type: "integer" },
              operations: { type: "array" },
            },
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(
        registryPath,
        JSON.stringify({ version: 1, operations: "not-an-array" }, null, 2),
        "utf8",
      );

      const layer = Layer.mergeAll(
        CliFileSystemLive,
        Layer.succeed(CliConfig, {
          cwd: process.cwd(),
          operationsPath: registryPath,
          operationsSchemaPath: schemaPath,
        }),
      );

      const result = await Effect.runPromise(
        loadOperationRegistry().pipe(Effect.provide(layer), Effect.either),
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("RegistryValidationError");
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("tags utility command failures deterministically", async () => {
    const result = await Effect.runPromise(
      runUtilityCommandEffect({
        key: "workflow-memory:coverage",
        input: {
          month: "bad-month",
          min: 1,
          strict: true,
          json: true,
          auditTaxonomy: false,
        },
      }).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("WorkflowMemoryError");
    }
  });
});
