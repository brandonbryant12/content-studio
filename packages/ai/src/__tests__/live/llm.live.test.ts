/**
 * Live integration tests for LLM (Google Gemini) service.
 *
 * These tests are SKIPPED by default and only run when GEMINI_API_KEY is set.
 * Use them to verify:
 * - Service configuration before deployment
 * - API connectivity and credentials
 * - Real API response handling
 *
 * Run with: GEMINI_API_KEY=xxx pnpm --filter @repo/ai test:live:llm
 */
import { describe, it, expect } from 'vitest';
import { Effect, Schema } from 'effect';
import { GoogleLive, LLM } from '../../llm';
import { LLMError, LLMRateLimitError } from '../../errors';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

describe.skipIf(!GEMINI_API_KEY)('LLM Live Integration', () => {
  const layer = GoogleLive({ apiKey: GEMINI_API_KEY! });

  describe('generate', () => {
    it('can generate text with simple prompt', async () => {
      const GreetingSchema = Schema.Struct({
        greeting: Schema.String,
      });

      const effect = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say "Hello, World!" in a greeting object',
          schema: GreetingSchema,
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.object).toBeDefined();
      expect(result.object.greeting).toBeDefined();
      expect(typeof result.object.greeting).toBe('string');
    });

    it('returns structured JSON when requested', async () => {
      const PersonSchema = Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
        occupation: Schema.String,
      });

      const effect = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt:
            'Generate a fictional person with name "Alice Smith", age 30, occupation "Software Engineer"',
          schema: PersonSchema,
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.object).toBeDefined();
      expect(result.object.name).toBe('Alice Smith');
      expect(result.object.age).toBe(30);
      expect(result.object.occupation).toBe('Software Engineer');
    });

    it('returns token usage metrics', async () => {
      const SimpleSchema = Schema.Struct({
        message: Schema.String,
      });

      const effect = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Generate a simple message saying "test"',
          schema: SimpleSchema,
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.usage).toBeDefined();
      expect(result.usage?.inputTokens).toBeGreaterThan(0);
      expect(result.usage?.outputTokens).toBeGreaterThan(0);
      expect(result.usage?.totalTokens).toBe(
        result.usage!.inputTokens + result.usage!.outputTokens,
      );
    });

    it('respects system prompt', async () => {
      const ResponseSchema = Schema.Struct({
        response: Schema.String,
      });

      const effect = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          system:
            'You are a pirate. Always respond like a pirate would, using pirate slang.',
          prompt: 'Say hello',
          schema: ResponseSchema,
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.object.response).toBeDefined();
      // The response should contain pirate-like language
      const response = result.object.response.toLowerCase();
      expect(
        response.includes('ahoy') ||
          response.includes('matey') ||
          response.includes('arr') ||
          response.includes('ye') ||
          response.includes('pirate'),
      ).toBe(true);
    });

    it('respects temperature setting', async () => {
      const NumberSchema = Schema.Struct({
        number: Schema.Number,
      });

      // With temperature 0, responses should be deterministic
      const effect = Effect.gen(function* () {
        const llm = yield* LLM;
        const results = [];

        for (let i = 0; i < 3; i++) {
          const result = yield* llm.generate({
            prompt: 'Generate the number 42',
            schema: NumberSchema,
            temperature: 0,
          });
          results.push(result.object.number);
        }

        return results;
      }).pipe(Effect.provide(layer));

      const results = await Effect.runPromise(effect);

      // All results should be identical with temperature 0
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });

  describe('error handling', () => {
    it('handles invalid API key (401)', async () => {
      const invalidLayer = GoogleLive({ apiKey: 'invalid-api-key' });

      const SimpleSchema = Schema.Struct({
        message: Schema.String,
      });

      const effect = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hello',
          schema: SimpleSchema,
        });
      }).pipe(Effect.provide(invalidLayer));

      const result = await Effect.runPromiseExit(effect);

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause;
        // Should be an LLMError (not rate limit for invalid key)
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          expect(
            error.error instanceof LLMError ||
              error.error instanceof LLMRateLimitError,
          ).toBe(true);
        }
      }
    });
  });
});

describe.skipIf(!GEMINI_API_KEY)('LLM Live Integration - Rate Limiting', () => {
  // Note: This test is harder to trigger reliably without hitting actual limits
  // It's included for manual verification when debugging rate limit issues

  it.skip('handles rate limiting gracefully (429)', async () => {
    const layer = GoogleLive({ apiKey: GEMINI_API_KEY! });

    const SimpleSchema = Schema.Struct({
      message: Schema.String,
    });

    // Send many requests in parallel to potentially trigger rate limiting
    const effects = Array.from({ length: 50 }, () =>
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hello',
          schema: SimpleSchema,
        });
      }).pipe(Effect.provide(layer)),
    );

    const results = await Promise.allSettled(
      effects.map((e) => Effect.runPromise(e)),
    );

    // At least some should succeed, and any failures should be LLMRateLimitError
    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes.length).toBeGreaterThan(0);

    // If there are failures, they should be rate limit errors
    for (const failure of failures) {
      if (failure.status === 'rejected') {
        expect(failure.reason).toBeInstanceOf(LLMRateLimitError);
      }
    }
  });
});
