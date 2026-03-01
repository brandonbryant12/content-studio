import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const CLI_PATH = "software-factory/scripts/factory/software-factory.ts";

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

describe("software-factory cli", () => {
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

    expect(result.status).toBe(1);
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
});
