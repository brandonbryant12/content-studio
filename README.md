# Content Studio

Content Studio is a product playground for multimodal generative AI.
It is built to help teams experiment with different AI modalities, compare outputs, and quickly iterate on new experiences.

## Product Vision

Enable one workspace where creators can:

1. Bring in source material.
2. Apply style and voice through personas.
3. Generate outputs across multiple AI modalities.
4. Test, compare, and refine results fast.

## Current Modalities

1. Documents: ingest and structure source context.
2. Podcasts: generate long-form audio content.
3. Voiceovers: generate focused narration.
4. Infographics: generate visual summaries.

## Why This Exists

Most AI products support one modality at a time.
Content Studio is designed as a practical sandbox to explore what works across modalities and to make it easy to add new ones.

## How It Works

1. Web app for content creation and iteration.
2. API and domain services for orchestration.
3. Background workers for async generation jobs.
4. Pluggable AI providers for LLM/TTS workflows.

## Quick Start

```bash
corepack enable
pnpm install
docker compose up -d
pnpm db:push
pnpm dev
```

## Key References

1. Behavior specification: [`docs/master-spec.md`](./docs/master-spec.md)
2. Setup and environment details: [`docs/setup.md`](./docs/setup.md)
3. Architecture overview: [`docs/architecture/overview.md`](./docs/architecture/overview.md)
