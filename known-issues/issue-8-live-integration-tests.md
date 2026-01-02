# Add live integration tests for external services (LLM, TTS, Storage)

**Issue:** [#8](https://github.com/brandonbryant12/content-studio/issues/8)
**Author:** brandonbryant12
**Created:** 2026-01-02
**State:** OPEN

## Summary

Add integration tests that can verify external services (LLM, TTS, Storage) are working correctly. These tests should be **skipped by default** but easily enabled for:
- Verifying service configuration before deployment
- Debugging connection issues
- Validating API keys and credentials

## Motivation

Currently, all integration tests use mocks (`MockLLMLive`, `MockTTSLive`, `createInMemoryStorage`). While this is great for fast, reliable CI, we have no way to:
- Verify that external services are actually reachable
- Test real API responses and error handling
- Validate credentials before deploying

## Proposed Solution

### 1. Test Structure

Create a new test directory for live service tests:

```
packages/
├── ai/src/__tests__/live/
│   ├── llm.live.test.ts      # Gemini LLM tests
│   └── tts.live.test.ts      # Gemini TTS tests
├── storage/src/__tests__/live/
│   └── s3.live.test.ts       # S3/R2 storage tests
```

### 2. Skip by Default

Tests should check for required environment variables and skip if not present:

```typescript
import { describe, it, expect } from 'vitest';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

describe.skipIf(!GEMINI_API_KEY)('LLM Live Integration', () => {
  it('can generate text', async () => {
    // Real API call
  });

  it('handles rate limiting gracefully', async () => {
    // Real API call
  });
});
```

### 3. Easy Activation

Add npm scripts to run live tests:

```json
{
  "scripts": {
    "test:live": "vitest run --testPathPattern=live",
    "test:live:llm": "vitest run packages/ai/src/__tests__/live/llm.live.test.ts",
    "test:live:tts": "vitest run packages/ai/src/__tests__/live/tts.live.test.ts",
    "test:live:storage": "vitest run packages/storage/src/__tests__/live/s3.live.test.ts"
  }
}
```

### 4. Required Environment Variables

| Service | Variables |
|---------|-----------|
| LLM | `GEMINI_API_KEY` |
| TTS | `GEMINI_API_KEY` |
| Storage | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |

### 5. Test Cases

**LLM (`llm.live.test.ts`)**
- [ ] Can generate text with simple prompt
- [ ] Handles token limits correctly
- [ ] Returns structured JSON when requested
- [ ] Handles invalid API key (401)
- [ ] Handles rate limiting (429)

**TTS (`tts.live.test.ts`)**
- [ ] Can list available voices
- [ ] Can generate audio from text
- [ ] Returns valid audio format (MP3/WAV)
- [ ] Handles invalid voice ID
- [ ] Handles rate limiting

**Storage (`s3.live.test.ts`)**
- [ ] Can upload file
- [ ] Can download file
- [ ] Can delete file
- [ ] Can list files with prefix
- [ ] Handles missing file (404)
- [ ] Handles invalid credentials

## Usage Examples

```bash
# Run all live tests (requires all env vars)
GEMINI_API_KEY=xxx S3_BUCKET=xxx pnpm test:live

# Run only LLM tests
GEMINI_API_KEY=xxx pnpm test:live:llm

# Quick connectivity check
GEMINI_API_KEY=xxx pnpm test:live:llm -- --testNamePattern="can generate text"
```

## Acceptance Criteria

- [ ] Live tests are skipped when env vars are missing
- [ ] Live tests are NOT run in CI by default
- [ ] Each service has basic connectivity test
- [ ] Each service has error handling tests
- [ ] Documentation in `specs/testing/live-tests.md`
