import { Effect, LogLevel } from 'effect';
import { describe, it, expect } from 'vitest';
import {
  log,
  logDebug,
  logInfo,
  logWarning,
  logError,
  annotateLogs,
  LoggingLive,
  withDebugLogging,
} from '../logging';

describe('logging', () => {
  describe('Effect logging functions', () => {
    it('should re-export Effect.log', () => {
      expect(log).toBe(Effect.log);
    });

    it('should re-export Effect.logDebug', () => {
      expect(logDebug).toBe(Effect.logDebug);
    });

    it('should re-export Effect.logInfo', () => {
      expect(logInfo).toBe(Effect.logInfo);
    });

    it('should re-export Effect.logWarning', () => {
      expect(logWarning).toBe(Effect.logWarning);
    });

    it('should re-export Effect.logError', () => {
      expect(logError).toBe(Effect.logError);
    });

    it('should re-export Effect.annotateLogs', () => {
      expect(annotateLogs).toBe(Effect.annotateLogs);
    });
  });

  describe('logging layers', () => {
    it('LoggingLive should create a layer', () => {
      const layer = LoggingLive({ level: LogLevel.Debug, format: 'json' });
      expect(layer).toBeDefined();
    });

    it('withDebugLogging should be defined', () => {
      expect(withDebugLogging).toBeDefined();
    });
  });

  describe('Effect.log usage', () => {
    it('should log messages', async () => {
      const program = Effect.gen(function* () {
        yield* Effect.log('Test message');
        return 'done';
      });

      const result = await Effect.runPromise(program);
      expect(result).toBe('done');
    });

    it('should support annotations', async () => {
      const program = Effect.gen(function* () {
        yield* Effect.log('Message with context');
        return 'done';
      }).pipe(Effect.annotateLogs('requestId', 'req-123'));

      const result = await Effect.runPromise(program);
      expect(result).toBe('done');
    });
  });
});
