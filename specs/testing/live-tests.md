# Live Integration Tests

Live integration tests verify that external services (LLM, TTS, Storage) are working correctly with real credentials. These tests are **skipped by default** and only run when the required environment variables are set.

## Purpose

Use live tests for:
- Verifying service configuration before deployment
- Debugging connection issues
- Validating API keys and credentials
- Testing real API responses and error handling

## Test Structure

```
packages/
├── ai/src/__tests__/live/
│   ├── llm.live.test.ts      # Gemini LLM tests
│   └── tts.live.test.ts      # Gemini TTS tests
├── storage/src/__tests__/live/
│   └── s3.live.test.ts       # S3/R2 storage tests
```

## Environment Variables

### LLM Tests
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |

### TTS Tests
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |

### Storage Tests
| Variable | Required | Description |
|----------|----------|-------------|
| `S3_BUCKET` | Yes | S3 bucket name |
| `S3_REGION` | Yes | AWS region (e.g., 'us-east-1') |
| `S3_ACCESS_KEY_ID` | Yes | AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | Yes | AWS secret access key |
| `S3_ENDPOINT` | No | Custom endpoint for R2/MinIO |

## Running Tests

### From Root

```bash
# Run all live tests (requires all env vars)
GEMINI_API_KEY=xxx S3_BUCKET=xxx S3_REGION=xxx S3_ACCESS_KEY_ID=xxx S3_SECRET_ACCESS_KEY=xxx pnpm test:live

# Run only LLM tests
GEMINI_API_KEY=xxx pnpm test:live:llm

# Run only TTS tests
GEMINI_API_KEY=xxx pnpm test:live:tts

# Run only Storage tests
S3_BUCKET=xxx S3_REGION=xxx S3_ACCESS_KEY_ID=xxx S3_SECRET_ACCESS_KEY=xxx pnpm test:live:storage
```

### From Package Directory

```bash
# AI package
cd packages/ai
GEMINI_API_KEY=xxx pnpm test:live
GEMINI_API_KEY=xxx pnpm test:live:llm
GEMINI_API_KEY=xxx pnpm test:live:tts

# Storage package
cd packages/storage
S3_BUCKET=xxx S3_REGION=xxx S3_ACCESS_KEY_ID=xxx S3_SECRET_ACCESS_KEY=xxx pnpm test:live
S3_BUCKET=xxx S3_REGION=xxx S3_ACCESS_KEY_ID=xxx S3_SECRET_ACCESS_KEY=xxx pnpm test:live:s3
```

### Quick Connectivity Check

```bash
# Test LLM connectivity only
GEMINI_API_KEY=xxx pnpm test:live:llm -- --testNamePattern="can generate text"

# Test TTS connectivity only
GEMINI_API_KEY=xxx pnpm test:live:tts -- --testNamePattern="can generate audio"

# Test S3 connectivity only
S3_BUCKET=xxx S3_REGION=xxx S3_ACCESS_KEY_ID=xxx S3_SECRET_ACCESS_KEY=xxx pnpm test:live:storage -- --testNamePattern="can upload"
```

## Test Coverage

### LLM Tests (`llm.live.test.ts`)

| Test | Description |
|------|-------------|
| Can generate text with simple prompt | Basic text generation |
| Returns structured JSON when requested | Schema-based generation |
| Returns token usage metrics | Token counting |
| Respects system prompt | System prompt behavior |
| Respects temperature setting | Deterministic output with temp=0 |
| Handles invalid API key (401) | Error handling |

### TTS Tests (`tts.live.test.ts`)

| Test | Description |
|------|-------------|
| Can list available voices | Voice catalog |
| Can filter voices by gender | Gender filtering |
| Can generate audio from text | Basic audio generation |
| Returns valid audio format (WAV) | LINEAR16 format validation |
| Returns valid audio format (MP3) | MP3 format validation |
| Can preview multiple voices | Multiple voice IDs |
| Can synthesize multi-speaker audio | Multi-speaker synthesis |
| Handles invalid API key | Error handling |

### Storage Tests (`s3.live.test.ts`)

| Test | Description |
|------|-------------|
| Can upload a file | Basic upload |
| Can upload binary data | Binary content |
| Can upload larger files | 1MB file upload |
| Can download a file | Basic download |
| Handles missing file (404) | Not found error |
| Can delete a file | Basic delete |
| Handles deleting non-existent file | Idempotent delete |
| Returns true for existing file | Exists check |
| Returns false for non-existent file | Not exists check |
| Returns URL for a key | URL generation |
| Can upload and download preserving content | Roundtrip |
| Can overwrite existing file | Update behavior |
| Handles invalid credentials | Auth error |

## Implementation Pattern

Live tests use `describe.skipIf()` to skip when env vars are missing:

```typescript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

describe.skipIf(!GEMINI_API_KEY)('LLM Live Integration', () => {
  const layer = GoogleLive({ apiKey: GEMINI_API_KEY! });

  it('can generate text', async () => {
    const effect = Effect.gen(function* () {
      const llm = yield* LLM;
      return yield* llm.generate({
        prompt: 'Say hello',
        schema: GreetingSchema,
      });
    }).pipe(Effect.provide(layer));

    const result = await Effect.runPromise(effect);
    expect(result.object).toBeDefined();
  });
});
```

## CI Integration

Live tests should NOT be run in CI by default:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test  # Regular tests only

# Optional: scheduled live tests
- name: Run live tests (nightly)
  if: github.event_name == 'schedule'
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    S3_BUCKET: ${{ secrets.S3_BUCKET }}
    # ... other secrets
  run: pnpm test:live
```

## Cleanup

Storage tests automatically clean up test files after completion using `afterAll()`:

```typescript
const TEST_KEY_PREFIX = `live-test-${Date.now()}`;
const createdKeys: string[] = [];

afterAll(async () => {
  for (const key of createdKeys) {
    await storage.delete(key);
  }
});
```

## Troubleshooting

### Tests Skipped

If tests are being skipped, check that environment variables are set:

```bash
echo $GEMINI_API_KEY
echo $S3_BUCKET
```

### Connection Errors

1. Verify API keys are valid
2. Check network connectivity
3. Verify S3 bucket exists and is accessible
4. Check for region mismatches

### Rate Limiting

Rate limit tests are skipped by default (`it.skip()`) because they require sending many requests. Enable them manually for debugging:

```typescript
// Change from:
it.skip('handles rate limiting', ...)

// To:
it('handles rate limiting', ...)
```

## Adding New Live Tests

1. Create test file in `__tests__/live/` directory
2. Use `describe.skipIf()` pattern with env var check
3. Add cleanup in `afterAll()` if creating resources
4. Add npm script to package.json
5. Update this documentation
