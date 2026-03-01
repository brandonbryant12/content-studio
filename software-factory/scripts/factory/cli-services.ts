import { promises as fs } from "node:fs";
import { Context, Effect, Layer } from "effect";
import {
  runCommandEffect,
  runStreamingCommandEffect,
  type CommandResult,
} from "../lib/command";

type ProcessOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  allowFailure?: boolean;
};

export class CliFileSystem extends Context.Tag("software-factory/CliFileSystem")<
  CliFileSystem,
  {
    readFile: (filePath: string, encoding?: BufferEncoding) => Effect.Effect<string, Error>;
    access: (filePath: string) => Effect.Effect<void, Error>;
    readdir: (
      directoryPath: string,
      options?: Parameters<typeof fs.readdir>[1],
    ) => Effect.Effect<Awaited<ReturnType<typeof fs.readdir>>, Error>;
    mkdir: (
      directoryPath: string,
      options?: Parameters<typeof fs.mkdir>[1],
    ) => Effect.Effect<Awaited<ReturnType<typeof fs.mkdir>>, Error>;
    writeFile: (
      filePath: string,
      content: string,
      encoding?: BufferEncoding,
    ) => Effect.Effect<void, Error>;
    appendFile: (
      filePath: string,
      content: string,
      encoding?: BufferEncoding,
    ) => Effect.Effect<void, Error>;
  }
>() {}

export class CliProcess extends Context.Tag("software-factory/CliProcess")<
  CliProcess,
  {
    run: (
      command: string,
      args: string[],
      options?: ProcessOptions,
    ) => Effect.Effect<CommandResult, Error>;
    runStreaming: (
      command: string,
      args: string[],
      options?: ProcessOptions,
    ) => Effect.Effect<CommandResult, Error>;
  }
>() {}

export class CliClock extends Context.Tag("software-factory/CliClock")<
  CliClock,
  {
    now: Effect.Effect<Date>;
    nowIso: Effect.Effect<string>;
  }
>() {}

export class CliConsole extends Context.Tag("software-factory/CliConsole")<
  CliConsole,
  {
    log: (line: string) => Effect.Effect<void>;
    error: (line: string) => Effect.Effect<void>;
  }
>() {}

export class CliConfig extends Context.Tag("software-factory/CliConfig")<
  CliConfig,
  {
    cwd: string;
    operationsPath: string;
    operationsSchemaPath: string;
  }
>() {}

export const CliFileSystemLive = Layer.sync(CliFileSystem, () => ({
  readFile: (filePath: string, encoding: BufferEncoding = "utf8") =>
    Effect.tryPromise({
      try: () => fs.readFile(filePath, encoding),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
  access: (filePath: string) =>
    Effect.tryPromise({
      try: () => fs.access(filePath),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
  readdir: (directoryPath: string, options?: Parameters<typeof fs.readdir>[1]) =>
    Effect.tryPromise({
      try: () =>
        options === undefined ? fs.readdir(directoryPath) : fs.readdir(directoryPath, options),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
  mkdir: (directoryPath: string, options?: Parameters<typeof fs.mkdir>[1]) =>
    Effect.tryPromise({
      try: () => fs.mkdir(directoryPath, options),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
  writeFile: (filePath: string, content: string, encoding: BufferEncoding = "utf8") =>
    Effect.tryPromise({
      try: () => fs.writeFile(filePath, content, encoding),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
  appendFile: (filePath: string, content: string, encoding: BufferEncoding = "utf8") =>
    Effect.tryPromise({
      try: () => fs.appendFile(filePath, content, encoding),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
}));

export const CliProcessLive = Layer.sync(CliProcess, () => ({
  run: (command: string, args: string[], options: ProcessOptions = {}) =>
    runCommandEffect(command, args, options),
  runStreaming: (command: string, args: string[], options: ProcessOptions = {}) =>
    runStreamingCommandEffect(command, args, options),
}));

export const CliClockLive = Layer.succeed(CliClock, {
  now: Effect.sync(() => new Date()),
  nowIso: Effect.sync(() => new Date().toISOString()),
});

export const CliConsoleLive = Layer.succeed(CliConsole, {
  log: (line: string) => Effect.sync(() => console.log(line)),
  error: (line: string) => Effect.sync(() => console.error(line)),
});

export const CliConfigLive = Layer.succeed(CliConfig, {
  cwd: process.cwd(),
  operationsPath: "software-factory/operations/registry.json",
  operationsSchemaPath: "software-factory/operations/registry.schema.json",
});

export const CliServicesLive = Layer.mergeAll(
  CliFileSystemLive,
  CliProcessLive,
  CliClockLive,
  CliConsoleLive,
  CliConfigLive,
);
