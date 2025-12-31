import { Effect, Logger, LogLevel, Layer } from 'effect';

/**
 * Re-export Effect's built-in logging functions.
 *
 * Effect provides structured logging out of the box:
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   yield* Effect.log("Processing request");
 *   yield* Effect.logDebug("Debug details");
 *   yield* Effect.logWarning("Something might be wrong");
 *   yield* Effect.logError("Operation failed");
 * });
 *
 * // Add context to all logs in a scope
 * const withContext = program.pipe(
 *   Effect.annotateLogs("requestId", "req-123"),
 *   Effect.annotateLogs("userId", "user-456")
 * );
 * ```
 */
export const log = Effect.log;
export const logDebug = Effect.logDebug;
export const logInfo = Effect.logInfo;
export const logWarning = Effect.logWarning;
export const logError = Effect.logError;
export const logFatal = Effect.logFatal;
export const annotateLogs = Effect.annotateLogs;
export const annotateLogsScoped = Effect.annotateLogsScoped;

export { LogLevel };

/**
 * Layer that sets the minimum log level.
 * Debug logs are disabled by default in Effect.
 */
export const withLogLevel = (level: LogLevel.LogLevel): Layer.Layer<never> =>
  Logger.minimumLogLevel(level);

/**
 * Layer that enables debug logging.
 */
export const withDebugLogging: Layer.Layer<never> = Logger.minimumLogLevel(
  LogLevel.Debug,
);

/**
 * Layer that uses JSON format for logs (useful for production).
 */
export const JsonLogger: Layer.Layer<never> = Logger.json;

/**
 * Layer that uses structured format for logs (default, human-readable).
 */
export const StructuredLogger: Layer.Layer<never> = Logger.structured;

/**
 * Layer that uses pretty format for development.
 */
export const PrettyLogger: Layer.Layer<never> = Logger.pretty;

/**
 * Creates a logging layer with common configuration.
 */
export interface LoggingConfig {
  readonly level?: LogLevel.LogLevel;
  readonly format?: 'json' | 'pretty' | 'structured';
}

export const LoggingLive = (config: LoggingConfig = {}): Layer.Layer<never> => {
  const levelLayer = config.level
    ? Logger.minimumLogLevel(config.level)
    : Layer.empty;

  const formatLayer =
    config.format === 'json'
      ? Logger.json
      : config.format === 'pretty'
        ? Logger.pretty
        : Layer.empty;

  return Layer.mergeAll(levelLayer, formatLayer);
};
