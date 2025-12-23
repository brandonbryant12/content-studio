import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import {
  withSpan,
  annotateSpan,
  TelemetryLive,
  TelemetryDisabled,
} from '../telemetry';

describe('telemetry', () => {
  describe('Effect span functions', () => {
    it('should re-export Effect.withSpan', () => {
      expect(withSpan).toBe(Effect.withSpan);
    });

    it('should re-export Effect.annotateCurrentSpan', () => {
      expect(annotateSpan).toBe(Effect.annotateCurrentSpan);
    });
  });

  describe('telemetry layers', () => {
    it('TelemetryLive should create a layer', () => {
      const layer = TelemetryLive({ serviceName: 'test', enabled: false });
      expect(layer).toBeDefined();
    });

    it('TelemetryDisabled should be an empty layer', () => {
      expect(TelemetryDisabled).toBeDefined();
    });
  });

  describe('Effect.withSpan usage', () => {
    it('should wrap effects in spans', async () => {
      const program = Effect.succeed(42).pipe(Effect.withSpan('test-span'));

      const result = await Effect.runPromise(program);
      expect(result).toBe(42);
    });

    it('should support nested spans', async () => {
      const program = Effect.succeed('nested').pipe(
        Effect.withSpan('inner'),
        Effect.withSpan('outer'),
      );

      const result = await Effect.runPromise(program);
      expect(result).toBe('nested');
    });

    it('should propagate errors through spans', async () => {
      const program = Effect.fail(new Error('Test error')).pipe(
        Effect.withSpan('failing'),
      );

      await expect(Effect.runPromise(program)).rejects.toThrow('Test error');
    });

    it('should support span attributes', async () => {
      const program = Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('user.id', 'user-123');
        return 'done';
      }).pipe(Effect.withSpan('with-attributes'));

      const result = await Effect.runPromise(program);
      expect(result).toBe('done');
    });
  });
});
