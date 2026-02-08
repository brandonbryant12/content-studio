# Task 04: Prompt Builder + Generation Pipeline

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md`

## Context

Follow the pattern in:
- `packages/media/src/podcast/prompts.ts` — buildSystemPrompt, buildUserPrompt pattern
- `packages/ai/src/llm/service.ts` — LLM.generate for structured output

## Key Files

### Create
- `packages/media/src/infographic/prompts.ts`

### Reference
- `packages/media/src/podcast/prompts.ts` — existing prompt builder pattern

## Implementation Notes

### Prompt Builder Interface
```typescript
export interface BuildPromptOptions {
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;
  prompt: string;
  documentContent?: string; // extracted content from source documents
}

export const buildInfographicPrompt = (options: BuildPromptOptions): string => {
  const parts: string[] = [];

  // 1. Type directive
  parts.push(getTypeDirective(options.infographicType));

  // 2. Content payload
  if (options.documentContent) {
    parts.push(`Use this source content:\n${options.documentContent}`);
  }
  parts.push(`User's prompt: ${options.prompt}`);

  // 3. Style modifier
  parts.push(getStyleModifier(options.stylePreset));

  // 4. Aspect ratio / dimensions
  parts.push(getFormatDirective(options.format));

  // 5. Quality control
  parts.push('Create a professional, clear, and visually appealing infographic. Ensure all text is legible and the layout is well-organized.');

  return parts.join('\n\n');
};
```

### Type Directives (4 MVP types)

**Timeline:**
```
Create an infographic showing a chronological timeline. Arrange events/milestones along a visual timeline with dates, brief descriptions, and relevant icons. Use a clear flow direction (top-to-bottom or left-to-right).
```

**Comparison:**
```
Create a comparison infographic with two or more items shown side-by-side. Use columns or visual dividers to clearly separate each item. Include matching categories for easy comparison.
```

**Stats Dashboard:**
```
Create a statistics dashboard infographic. Visualize numerical data using charts, graphs, large numbers, and icons. Highlight key metrics prominently with supporting context.
```

**Key Takeaways:**
```
Create a key takeaways infographic. Present the most important points as a numbered or bulleted visual list with icons. Use clear hierarchy to distinguish main points from supporting details.
```

### Style Modifiers (6 presets)

| Style | Modifier |
|-------|----------|
| Modern Minimal | Clean lines, generous whitespace, neutral palette (black, white, gray, one accent color), sans-serif typography |
| Bold & Colorful | Vibrant colors, strong contrast, large text, energetic layout, dynamic shapes |
| Corporate | Professional palette (navy, gray, white), structured grid, restrained decoration, clear data presentation |
| Playful | Rounded shapes, bright warm colors, hand-drawn style elements, friendly typography |
| Dark Mode | Dark background (#1a1a2e or similar), light text, neon/bright accent colors, modern feel |
| Editorial | Magazine-inspired layout, sophisticated typography, muted color palette, elegant spacing |

### Format Dimensions

```typescript
export const FORMAT_DIMENSIONS: Record<InfographicFormat, { width: number; height: number; label: string }> = {
  portrait: { width: 1080, height: 1920, label: 'Portrait (1080×1920)' },
  square: { width: 1080, height: 1080, label: 'Square (1080×1080)' },
  landscape: { width: 1920, height: 1080, label: 'Landscape (1920×1080)' },
  og_card: { width: 1200, height: 630, label: 'OG Card (1200×630)' },
};
```

Format directive example:
```
Generate this infographic at {width}x{height} pixels ({label}). Ensure the layout is optimized for this aspect ratio.
```

### Document Content Extraction

This is used by the worker when the infographic has `sourceDocumentIds`. It reads the document content from storage and uses the LLM to extract structured content:

```typescript
export const extractDocumentContent = (documentIds: string[]) =>
  Effect.gen(function* () {
    const docRepo = yield* DocumentRepo;
    const storage = yield* Storage;
    const llm = yield* LLM;

    // Read document contents in parallel
    const documents = yield* Effect.all(
      documentIds.map(id => docRepo.findById(id)),
      { concurrency: 'unbounded' }
    );

    const contents = yield* Effect.all(
      documents.map(doc =>
        storage.download(doc.contentKey).pipe(
          Effect.map(buf => buf.toString('utf-8'))
        )
      ),
      { concurrency: 'unbounded' }
    );

    // Use LLM to extract key content
    const { object } = yield* llm.generate({
      prompt: `Extract the key facts, statistics, and points from these documents for use in an infographic. Be concise.\n\n${contents.join('\n---\n')}`,
      schema: Schema.Struct({
        summary: Schema.String,
        keyPoints: Schema.Array(Schema.String),
        statistics: Schema.Array(Schema.Struct({
          label: Schema.String,
          value: Schema.String,
        })),
      }),
      maxTokens: 1000,
    });

    return object;
  }).pipe(Effect.withSpan('infographic.extractDocumentContent'));
```

### Keep Prompts Short
Total prompt should be under 250 words for reliable instruction-following with image generation models. The type directive + style modifier + format + quality control should use concise language.

## Verification Log

<!-- Agent writes verification results here -->
