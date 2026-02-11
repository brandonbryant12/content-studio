# Content Studio CLI

Interactive developer CLI for testing integrations against real services. Built with `@effect/cli`.

## Setup

The CLI reads environment variables from the root `.env` file. Make sure `GEMINI_API_KEY` is set:

```bash
# From the repo root
cp .env.example .env
# Add your GEMINI_API_KEY
```

## Commands

All commands are run from the repo root via:

```bash
pnpm cli test <command>
```

### `pnpm cli test llm`

Tests LLM structured output generation. Prompts you to select a model (Gemini 2.5 Flash or Pro), calls `LLM.generate` with a schema, and displays the response with token usage.

### `pnpm cli test tts`

Tests text-to-speech voice preview. Prompts you to filter by gender and select a voice, generates an audio preview, and saves the `.mp3` file to `tools/cli/.output/`.

### `pnpm cli test storage`

Runs a full CRUD lifecycle against filesystem storage (no S3 or database needed). Exercises upload, exists, download, getUrl, delete, and verify-deleted steps with pass/fail output.

### `pnpm cli seed voice-previews`

Generates TTS audio previews for the 8 frontend voices (Aoede, Kore, Leda, Zephyr, Charon, Fenrir, Puck, Orus) and uploads them to storage at `voice-previews/{voiceId}.wav`. Idempotent — skips voices that already have a preview in storage. Requires `GEMINI_API_KEY` and storage config (`STORAGE_PROVIDER`, `STORAGE_PATH`, etc.) in `.env`.

## Development

```bash
# Run tests
pnpm --filter @repo/cli test

# Typecheck
pnpm --filter @repo/cli typecheck

# Watch mode
pnpm --filter @repo/cli test:watch
```
