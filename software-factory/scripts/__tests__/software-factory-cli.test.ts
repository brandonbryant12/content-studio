import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const CLI_PATH = "software-factory/scripts/factory/software-factory.ts";
const CLI_TEST_TIMEOUT_MS = 90_000;

const runCli = (args: string[]) => {
  const result = spawnSync("pnpm", ["exec", "tsx", CLI_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

describe.sequential("software-factory cli", { timeout: CLI_TEST_TIMEOUT_MS }, () => {
  it("prints compact help from the root command", () => {
    const result = runCli(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pnpm software-factory <command> [options]");
    expect(result.stdout).toContain("COMMANDS");
    expect(result.stdout).toContain("operation");
  });

  it("fails unknown top-level commands with deterministic messaging", () => {
    const result = runCli(["nonsense"]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(2);
    expect(combinedOutput).toContain("Unknown command: nonsense.");
  });

  it("prints operation list as JSON", () => {
    const result = runCli(["operation", "list", "--json"]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Array<{ id: string }>;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed.some((entry) => entry.id === "ready-for-dev-executor")).toBe(true);
  });

  it("runs descriptor-generated operation command surfaces", () => {
    const result = runCli(["operation", "run", "issue-evaluator", "--dry-run"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("playbook:");
    expect(result.stdout).toContain("command: codex exec");
  });

  it("returns deterministic exit code for unknown operations", () => {
    const result = runCli(["operation", "run", "unknown-operation"]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(4);
    expect(combinedOutput).toContain("Unknown operation: unknown-operation");
  });

  it("returns deterministic input error for unknown operation args", () => {
    const result = runCli(["operation", "run", "issue-evaluator", "--not-a-real-flag"]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(2);
    expect(combinedOutput).toContain("Unknown argument --not-a-real-flag");
  });
});
