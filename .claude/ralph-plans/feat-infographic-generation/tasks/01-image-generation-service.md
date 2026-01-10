# Task 01: Image Generation Service

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/error-handling.md`
- [ ] `packages/ai/src/llm/service.ts` - LLM service pattern reference
- [ ] `packages/ai/src/tts/service.ts` - TTS service pattern reference
- [ ] `packages/ai/src/index.ts` - Combined layer pattern

## Context

The AI package follows a provider-agnostic, Effect-based architecture with:
1. **Service Interface** (service.ts) - Defines the contract
2. **Context.Tag** (service.ts) - Dependency injection token
3. **Provider Implementation** (providers/google.ts) - Concrete implementation
4. **Layer Factory** (providers/google.ts) - Creates the Effect layer

Google's Gemini 2.5 Flash Image API endpoint:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent
```

Request format:
```json
{
  "contents": [{ "parts": [{ "text": "prompt" }] }],
  "generationConfig": {
    "responseModalities": ["Image"],
    "aspectRatio": "16:9"
  }
}
```

Response format:
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inlineData": {
          "mimeType": "image/png",
          "data": "base64-encoded-image"
        }
      }]
    }
  }]
}
```

## Key Files

### Create New Files:
- `packages/ai/src/image/index.ts` - Exports
- `packages/ai/src/image/service.ts` - Service interface + Context.Tag
- `packages/ai/src/image/errors.ts` - Error definitions
- `packages/ai/src/image/providers/google.ts` - Google implementation

### Modify Existing Files:
- `packages/ai/src/index.ts` - Add Image exports, update GoogleAILive
- `packages/ai/src/errors.ts` - Export image errors

## Implementation Notes

### Service Interface (service.ts)

```typescript
import { Context, Effect } from 'effect';
import type { ImageError, ImageQuotaExceededError } from './errors';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';

export interface GenerateImageOptions {
  readonly prompt: string;
  readonly aspectRatio?: AspectRatio;  // Default: '1:1'
  readonly referenceImages?: readonly Buffer[];  // Optional reference images
}

export interface GenerateImageResult {
  readonly imageContent: Buffer;
  readonly mimeType: string;  // 'image/png'
  readonly width: number;
  readonly height: number;
}

export interface ImageService {
  readonly generate: (
    options: GenerateImageOptions,
  ) => Effect.Effect<GenerateImageResult, ImageError | ImageQuotaExceededError>;
}

export class Image extends Context.Tag('@repo/ai/Image')<Image, ImageService>() {}
```

### Error Definitions (errors.ts)

```typescript
import { Schema } from 'effect';

export class ImageError extends Schema.TaggedError<ImageError>()('ImageError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly httpStatus = 502 as const;
  static readonly httpCode = 'SERVICE_UNAVAILABLE' as const;
  static readonly httpMessage = 'Image generation service unavailable';
  static readonly logLevel = 'error' as const;
}

export class ImageQuotaExceededError extends Schema.TaggedError<ImageQuotaExceededError>()(
  'ImageQuotaExceededError',
  {
    message: Schema.String,
  },
) {
  static readonly httpStatus = 429 as const;
  static readonly httpCode = 'RATE_LIMITED' as const;
  static readonly httpMessage = 'Image generation quota exceeded';
  static readonly logLevel = 'warning' as const;
}
```

### Google Provider Key Points

1. Use `Effect.tryPromise` for API call
2. Map 429 status to `ImageQuotaExceededError`
3. Map other errors to `ImageError`
4. Add tracing span: `image.generate` with attributes:
   - `image.provider`: 'google'
   - `image.model`: model ID
   - `image.aspectRatio`: requested aspect ratio
5. Decode base64 response to Buffer
6. Extract dimensions from PNG header if not provided

### Combined Layer Update

```typescript
// In packages/ai/src/index.ts
export const GoogleAILive = (config: GoogleAIConfig): Layer.Layer<AI> =>
  Layer.mergeAll(
    GoogleLive({ apiKey: config.apiKey, model: config.llmModel }),
    GoogleTTSLive({ apiKey: config.apiKey, model: config.ttsModel }),
    GoogleImageLive({ apiKey: config.apiKey, model: config.imageModel }),  // Add this
  );
```

## Verification Log

<!-- Agent writes verification results here -->
