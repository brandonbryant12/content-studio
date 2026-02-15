# Live Integration Tests

Live tests verify external services (LLM, TTS, Storage) with real credentials. Skipped by default; only run when environment variables are set.
<!-- enforced-by: manual-review -->

## Commands

```bash
pnpm test:live              # All live tests (requires all env vars)
pnpm test:live:llm          # LLM only (requires GEMINI_API_KEY)
pnpm test:live:tts          # TTS only (requires GEMINI_API_KEY)
pnpm test:live:storage      # Storage only (requires S3_* vars)
```

## Environment Variables

| Suite | Required Variables |
|---|---|
| LLM | `GEMINI_API_KEY` |
| TTS | `GEMINI_API_KEY` |
| Storage | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| Storage (optional) | `S3_ENDPOINT` (for R2/MinIO) |

## Test File Locations

```
packages/ai/src/__tests__/live/llm.live.test.ts
packages/ai/src/__tests__/live/tts.live.test.ts
packages/storage/src/__tests__/live/s3.live.test.ts
```

## Skip Pattern
<!-- enforced-by: architecture -->

All live tests use `describe.skipIf(!ENV_VAR)` so they are invisible in normal `pnpm test` runs.

```typescript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

describe.skipIf(!GEMINI_API_KEY)('LLM Live Integration', () => {
  const layer = GoogleLive({ apiKey: GEMINI_API_KEY! });

  it.effect('can generate text', () =>
    Effect.gen(function* () {
      const llm = yield* LLM;
      const result = yield* llm.generate({ prompt: 'Say hello' });
      expect(result.object).toBeDefined();
    }).pipe(Effect.provide(layer))
  );
});
```

## Cleanup
<!-- enforced-by: manual-review -->

Storage tests must clean up created objects in `afterAll`:

```typescript
const createdKeys: string[] = [];
afterAll(async () => {
  for (const key of createdKeys) await storage.delete(key);
});
```

## CI Policy
<!-- enforced-by: architecture -->

Live tests are **not** run in CI by default. Use scheduled/nightly runs with secrets injected via CI environment.
