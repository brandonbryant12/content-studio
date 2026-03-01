#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../lib/command";
import { runScript } from "../lib/effect-script";

const DEFAULT_MEMORY_PATH = path.join("software-factory", "workflow-memory");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

type CommandResult = {
  status: number | null;
  stdout?: string;
  stderr?: string;
};

type CommandRunner = (
  cwd: string,
  command: string,
  args: string[],
) => Promise<CommandResult> | CommandResult;

const trimOutput = (value: string | undefined): string =>
  typeof value === "string" ? value.trim() : "";

const combinedOutput = (result: CommandResult): string =>
  [trimOutput(result.stdout), trimOutput(result.stderr)].filter(Boolean).join("\n");

const runCommandWithResult: CommandRunner = async (
  cwd,
  command,
  args,
) =>
  runCommand(command, args, {
    cwd,
    allowFailure: true,
  });

const isTsxMissingError = (output: string): boolean =>
  output.includes('Command "tsx" not found') ||
  output.includes("ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL");

export const parseArgs = (argv: string[]) => {
  let bootstrap = false;
  let cwd = process.cwd();
  let memoryPath = DEFAULT_MEMORY_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--bootstrap") {
      bootstrap = true;
      continue;
    }

    if (value === "--cwd") {
      cwd = argv[index + 1] ?? cwd;
      index += 1;
      continue;
    }

    if (value === "--memory-path") {
      memoryPath = argv[index + 1] ?? memoryPath;
      index += 1;
    }
  }

  return { bootstrap, cwd, memoryPath };
};

export const runWorkflowMemoryPreflight = async ({
  bootstrap,
  cwd,
  memoryPath,
  logger = console.log,
  errorLogger = console.error,
  commandRunner = runCommandWithResult,
}: {
  bootstrap: boolean;
  cwd: string;
  memoryPath: string;
  logger?: (line: string) => void;
  errorLogger?: (line: string) => void;
  commandRunner?: CommandRunner;
}): Promise<number> => {
  logger(`[workflow-memory:preflight] memory path: ${memoryPath}`);
  logger("[workflow-memory:preflight] checking tsx runtime via pnpm exec");

  const initialCheck = await commandRunner(cwd, pnpmCommand, ["exec", "tsx", "--version"]);
  if (initialCheck.status === 0) {
    logger("[workflow-memory:preflight] runtime ready");
    return 0;
  }

  const initialOutput = combinedOutput(initialCheck);
  const missingTsx = isTsxMissingError(initialOutput);

  if (!bootstrap) {
    const prefix = missingTsx
      ? "[workflow-memory:preflight] missing tsx runtime dependency."
      : "[workflow-memory:preflight] runtime check failed.";
    errorLogger(prefix);
    errorLogger(
      "[workflow-memory:preflight] remediation: run `pnpm install --frozen-lockfile --prefer-offline`, then rerun the automation.",
    );
    if (initialOutput) {
      errorLogger(`[workflow-memory:preflight] command output:\n${initialOutput}`);
    }
    return 1;
  }

  logger("[workflow-memory:preflight] bootstrapping dependencies with pnpm install");
  const installResult = await commandRunner(cwd, pnpmCommand, [
    "install",
    "--frozen-lockfile",
    "--prefer-offline",
  ]);
  if (installResult.status !== 0) {
    const installOutput = combinedOutput(installResult);
    errorLogger("[workflow-memory:preflight] dependency bootstrap failed.");
    errorLogger(
      "[workflow-memory:preflight] remediation: resolve pnpm install failure, then rerun the automation.",
    );
    if (installOutput) {
      errorLogger(`[workflow-memory:preflight] install output:\n${installOutput}`);
    }
    return 1;
  }

  logger("[workflow-memory:preflight] bootstrap succeeded, rechecking runtime");
  const retryCheck = await commandRunner(cwd, pnpmCommand, ["exec", "tsx", "--version"]);
  if (retryCheck.status === 0) {
    logger("[workflow-memory:preflight] runtime ready after bootstrap");
    return 0;
  }

  const retryOutput = combinedOutput(retryCheck);
  errorLogger("[workflow-memory:preflight] runtime still unavailable after bootstrap.");
  errorLogger(
    "[workflow-memory:preflight] remediation: inspect pnpm/tsx installation state and rerun.",
  );
  if (retryOutput) {
    errorLogger(`[workflow-memory:preflight] command output:\n${retryOutput}`);
  }
  return 1;
};

export const main = async (argv: string[] = process.argv.slice(2)): Promise<number> => {
  return await runWorkflowMemoryPreflight(parseArgs(argv));
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runScript(main);
}
