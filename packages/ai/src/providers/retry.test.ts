import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  matchesTransientProviderFailure,
  retryTransientProvider,
} from './retry';

describe('provider retry helpers', () => {
  it('classifies transient failures from status, network, and message hints', () => {
    expect(
      matchesTransientProviderFailure({
        statusCode: 503,
      }),
    ).toBe(true);

    expect(
      matchesTransientProviderFailure({
        statusName: 'RESOURCE_EXHAUSTED',
        additionalStatusNames: ['RESOURCE_EXHAUSTED'],
      }),
    ).toBe(true);

    expect(
      matchesTransientProviderFailure({
        networkCode: 'ECONNRESET',
      }),
    ).toBe(true);

    expect(
      matchesTransientProviderFailure({
        message: 'Provider is temporarily unavailable',
      }),
    ).toBe(true);

    expect(
      matchesTransientProviderFailure({
        statusCode: 400,
        message: 'Validation failed',
      }),
    ).toBe(false);
  });

  it('retries tagged transient provider errors with bounded attempts', async () => {
    let attempts = 0;

    const result = await Effect.runPromise(
      retryTransientProvider(
        Effect.suspend(() => {
          attempts += 1;
          return attempts < 3
            ? Effect.fail({ _tag: 'TTSError' as const })
            : Effect.succeed('ok');
        }),
      ),
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('does not retry non-transient tagged errors', async () => {
    let attempts = 0;

    const exit = await Effect.runPromiseExit(
      retryTransientProvider(
        Effect.suspend(() => {
          attempts += 1;
          return Effect.fail({ _tag: 'VoiceNotFoundError' as const });
        }),
      ),
    );

    expect(exit._tag).toBe('Failure');
    expect(attempts).toBe(1);
  });
});
