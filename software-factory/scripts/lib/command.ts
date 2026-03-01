import { spawn } from "node:child_process";
import { Effect } from "effect";

export type CommandResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type CommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  allowFailure?: boolean;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const formatFailure = (
  command: string,
  args: string[],
  result: CommandResult,
): string => {
  const details = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
  return details
    ? `${command} ${args.join(" ")} failed with exit code ${result.status}:\n${details}`
    : `${command} ${args.join(" ")} failed with exit code ${result.status}.`;
};

const runSpawn = async (
  command: string,
  args: string[],
  options: CommandOptions & { stdoutMode: "pipe" | "inherit"; stderrMode: "pipe" | "inherit" },
): Promise<CommandResult> =>
  new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", options.stdoutMode, options.stderrMode],
    });

    let stdout = "";
    let stderr = "";

    child.on("error", (error) => reject(error));

    if (options.stdoutMode === "pipe") {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }
    if (options.stderrMode === "pipe") {
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    if (options.input) {
      child.stdin?.write(options.input);
    }
    child.stdin?.end();

    child.on("close", (code) => {
      resolve({
        status: code ?? 1,
        stdout,
        stderr,
      });
    });
  });

export const runCommandEffect = (
  command: string,
  args: string[],
  options: CommandOptions = {},
): Effect.Effect<CommandResult, Error> =>
  Effect.tryPromise({
    try: async () => {
      const result = await runSpawn(command, args, {
        ...options,
        stdoutMode: "pipe",
        stderrMode: "pipe",
      });

      if (!options.allowFailure && result.status !== 0) {
        throw new Error(formatFailure(command, args, result));
      }

      return result;
    },
    catch: toError,
  });

export const runStreamingCommandEffect = (
  command: string,
  args: string[],
  options: CommandOptions = {},
): Effect.Effect<CommandResult, Error> =>
  Effect.tryPromise({
    try: async () => {
      const result = await runSpawn(command, args, {
        ...options,
        stdoutMode: "inherit",
        stderrMode: "inherit",
      });

      if (!options.allowFailure && result.status !== 0) {
        throw new Error(formatFailure(command, args, result));
      }

      return result;
    },
    catch: toError,
  });

export const runCommand = (
  command: string,
  args: string[],
  options: CommandOptions = {},
): Promise<CommandResult> => Effect.runPromise(runCommandEffect(command, args, options));

export const runStreamingCommand = (
  command: string,
  args: string[],
  options: CommandOptions = {},
): Promise<CommandResult> =>
  Effect.runPromise(runStreamingCommandEffect(command, args, options));
