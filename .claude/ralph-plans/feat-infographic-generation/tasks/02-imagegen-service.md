# Task 02: ImageGen AI Service + Domain Errors

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/error-handling.md`

## Context

Follow the exact patterns in:
- `packages/ai/src/llm/service.ts` — LLM service interface + Context.Tag
- `packages/ai/src/llm/providers/google.ts` — Google LLM provider with Layer.succeed
- `packages/ai/src/tts/service.ts` — TTS service interface (another reference)
- `packages/ai/src/errors.ts` — Schema.TaggedError with HTTP protocol properties
- `packages/media/src/errors.ts` — Domain errors (NotFound, NotOwner patterns)

## Key Files

### Modify
- `packages/ai/src/errors.ts` — Add `ImageGenError`, `ImageGenRateLimitError`, `ImageGenContentFilteredError`
- `packages/ai/src/index.ts` — Export new image-gen module
- `packages/media/src/errors.ts` — Add `InfographicNotFound`, `NotInfographicOwner`, `InfographicError`

### Create
- `packages/ai/src/image-gen/service.ts` — ImageGen service interface
- `packages/ai/src/image-gen/providers/google.ts` — Google Gemini image gen provider
- `packages/ai/src/image-gen/index.ts` — Module exports

## Implementation Notes

### AI Errors (in `packages/ai/src/errors.ts`)
```typescript
export class ImageGenError extends Schema.TaggedError<ImageGenError>()(
  'ImageGenError',
  {
    message: Schema.String,
    model: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 502 as const;
  static readonly httpCode = 'SERVICE_UNAVAILABLE' as const;
  static readonly httpMessage = 'Image generation service unavailable';
  static readonly logLevel = 'error' as const;
}

export class ImageGenRateLimitError extends Schema.TaggedError<ImageGenRateLimitError>()(
  'ImageGenRateLimitError',
  {
    message: Schema.String,
    retryAfter: Schema.optional(Schema.Number),
  },
) {
  static readonly httpStatus = 429 as const;
  static readonly httpCode = 'RATE_LIMITED' as const;
  static readonly httpMessage = 'Image generation rate limit exceeded';
  static readonly logLevel = 'warn' as const;
}

export class ImageGenContentFilteredError extends Schema.TaggedError<ImageGenContentFilteredError>()(
  'ImageGenContentFilteredError',
  {
    message: Schema.String,
    prompt: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'CONTENT_FILTERED' as const;
  static readonly httpMessage = 'Image could not be generated. Please adjust your prompt and try again.';
  static readonly logLevel = 'silent' as const;
}
```

### Service Interface
```typescript
export interface GenerateImageOptions {
  readonly prompt: string;
  readonly format: 'portrait' | 'square' | 'landscape' | 'og_card';
}

export interface GenerateImageResult {
  readonly imageData: Buffer;
  readonly mimeType: string;
}

export interface ImageGenService {
  readonly generateImage: (
    options: GenerateImageOptions,
  ) => Effect.Effect<GenerateImageResult, ImageGenError | ImageGenRateLimitError | ImageGenContentFilteredError>;
}

export class ImageGen extends Context.Tag('@repo/ai/ImageGen')<ImageGen, ImageGenService>() {}
```

### Google Provider
- Use `@google/generative-ai` package (NOT `@ai-sdk/google`)
- Install: `pnpm --filter @repo/ai add @google/generative-ai` (check if already installed)
- Create `GoogleGenerativeAI` instance with API key from env
- Call `model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], ... } })`
- Map format to dimensions for the prompt (the model uses the prompt to determine aspect ratio)
- Extract image data from response `parts[0].inlineData`
- Map errors: rate limit → `ImageGenRateLimitError`, safety filter → `ImageGenContentFilteredError`, other → `ImageGenError`
- Use `Effect.tryPromise` with `mapError`, wrap in `Effect.withSpan`
- Export `GoogleImageGenLive = Layer.succeed(ImageGen, make)`

### Domain Errors (in `packages/media/src/errors.ts`)
Follow the same pattern as `PodcastNotFound`, `NotPodcastOwner`, `PodcastError`:
```typescript
export class InfographicNotFound extends Schema.TaggedError<InfographicNotFound>()(
  'InfographicNotFound',
  { id: Schema.String, message: Schema.optional(Schema.String) },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'INFOGRAPHIC_NOT_FOUND' as const;
  static readonly httpMessage = (e: InfographicNotFound) => e.message ?? `Infographic ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: InfographicNotFound) { return { infographicId: e.id }; }
}

// + NotInfographicOwner (403), InfographicError (500)
```

Also add these to the `MediaError` union type at the bottom of the file.

## Verification Log

<!-- Agent writes verification results here -->
