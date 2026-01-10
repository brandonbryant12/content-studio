# Task 07: AI Extraction Use Case

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md`
- [ ] `packages/ai/src/llm/service.ts` - LLM service interface
- [ ] `packages/media/src/podcast/use-cases/generate-script.ts` - LLM usage example

## Context

This use case provides AI-assisted key point extraction from documents. Users can click "Extract Key Points" to have the LLM analyze their documents and suggest relevant text snippets to include in the infographic.

The LLM will:
1. Analyze document content
2. Identify key facts, statistics, quotes, and important points
3. Return structured suggestions with relevance scores
4. Reference which document each suggestion came from

## Key Files

### Create New Files:
- `packages/media/src/infographic/use-cases/extract-key-points.ts`

### Update:
- `packages/media/src/infographic/use-cases/index.ts` - Export

## Implementation Notes

### Output Schema

```typescript
import { Schema } from 'effect';

// Schema for LLM structured output
export const KeyPointSchema = Schema.Struct({
  text: Schema.String,
  documentIndex: Schema.Number,  // Index in input documents array
  relevance: Schema.Literal('high', 'medium'),
  category: Schema.optional(Schema.String),  // e.g., 'statistic', 'quote', 'fact'
});

export const KeyPointsOutputSchema = Schema.Struct({
  keyPoints: Schema.Array(KeyPointSchema),
});

export type KeyPoint = Schema.Schema.Type<typeof KeyPointSchema>;
export type KeyPointsOutput = Schema.Schema.Type<typeof KeyPointsOutputSchema>;
```

### System Prompt

```typescript
const EXTRACTION_SYSTEM_PROMPT = `You are an expert at analyzing documents and extracting key points for infographic creation.

Your task is to identify the most important, visualizable content from the provided documents.

Look for:
1. **Statistics and Numbers** - Percentages, counts, measurements that can be visualized
2. **Key Facts** - Important statements that convey core information
3. **Quotes** - Notable statements from people or sources
4. **Comparisons** - Data that shows differences or similarities
5. **Process Steps** - Sequential information that can be shown as a flow
6. **Lists** - Grouped items that belong together

Guidelines:
- Extract 8-12 key points maximum
- Keep each point concise (under 100 words)
- Prioritize content that is visually representable
- Include the document index so we know which document each point came from
- Mark relevance as 'high' for essential points, 'medium' for supporting details

Return a JSON object with a 'keyPoints' array.`;
```

### Use Case Implementation

```typescript
// packages/media/src/infographic/use-cases/extract-key-points.ts
import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { LLM } from '@repo/ai';
import { InfographicRepo } from '../repos';
import { DocumentRepo, getDocumentContent } from '@repo/media/document';
import {
  InfographicNotFoundError,
  NotInfographicOwnerError,
  DocumentNotFoundError,
} from '../errors';
import { KeyPointsOutputSchema, type KeyPoint } from './schemas';

export interface ExtractKeyPointsInput {
  infographicId: string;
}

export interface KeyPointSuggestion {
  text: string;
  documentId: string;
  documentTitle: string;
  relevance: 'high' | 'medium';
  category?: string;
}

export interface ExtractKeyPointsResult {
  suggestions: KeyPointSuggestion[];
}

export const extractKeyPoints = (input: ExtractKeyPointsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const documentRepo = yield* DocumentRepo;
    const llm = yield* LLM;

    // Get infographic with source documents
    const infographic = yield* infographicRepo.findById(input.infographicId);

    if (!infographic) {
      return yield* Effect.fail(
        new InfographicNotFoundError({ infographicId: input.infographicId }),
      );
    }

    if (infographic.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotInfographicOwnerError({
          infographicId: input.infographicId,
          userId: user.id,
        }),
      );
    }

    // Get document content for all source documents
    const documentIds = infographic.sourceDocumentIds;
    const documents: Array<{ id: string; title: string; content: string }> = [];

    for (const docId of documentIds) {
      const doc = yield* documentRepo.findById(docId);
      if (!doc) continue;

      const content = yield* getDocumentContent({ documentId: docId });
      documents.push({
        id: docId,
        title: doc.title,
        content: content.content,
      });
    }

    if (documents.length === 0) {
      return { suggestions: [] };
    }

    // Build user prompt with document content
    const documentsSection = documents
      .map((doc, i) => `--- Document ${i} (${doc.title}) ---\n${doc.content}`)
      .join('\n\n');

    const userPrompt = `Analyze the following documents and extract key points for an infographic:

${documentsSection}

Extract the most important, visualizable content as structured JSON.`;

    // Call LLM
    const result = yield* llm.generate({
      system: EXTRACTION_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: KeyPointsOutputSchema,
      temperature: 0.5,  // Lower temperature for more consistent extraction
    });

    // Map LLM output to suggestions with document info
    const suggestions: KeyPointSuggestion[] = result.object.keyPoints
      .filter((kp) => kp.documentIndex >= 0 && kp.documentIndex < documents.length)
      .map((kp) => ({
        text: kp.text,
        documentId: documents[kp.documentIndex].id,
        documentTitle: documents[kp.documentIndex].title,
        relevance: kp.relevance,
        category: kp.category,
      }));

    return { suggestions };
  }).pipe(
    Effect.withSpan('useCase.extractKeyPoints', {
      attributes: {
        'infographic.id': input.infographicId,
      },
    }),
  );
```

### Alternative: Extract from Specific Documents

If user wants to extract from documents not yet linked to the infographic:

```typescript
export interface ExtractFromDocumentsInput {
  documentIds: string[];
}

export const extractFromDocuments = (input: ExtractFromDocumentsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;
    const llm = yield* LLM;

    // Validate and load documents
    const documents: Array<{ id: string; title: string; content: string }> = [];

    for (const docId of input.documentIds) {
      const doc = yield* documentRepo.findById(docId);

      if (!doc || doc.createdBy !== user.id) {
        return yield* Effect.fail(
          new DocumentNotFoundError({ documentId: docId }),
        );
      }

      const content = yield* getDocumentContent({ documentId: docId });
      documents.push({
        id: docId,
        title: doc.title,
        content: content.content,
      });
    }

    // ... same LLM call logic as above

    return { suggestions };
  }).pipe(
    Effect.withSpan('useCase.extractFromDocuments', {
      attributes: {
        'document.count': input.documentIds.length,
      },
    }),
  );
```

### Error Handling

The LLM might fail to parse or return invalid output. Handle gracefully:

```typescript
// In the use case, wrap LLM call with error handling
const result = yield* llm
  .generate({
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: userPrompt,
    schema: KeyPointsOutputSchema,
    temperature: 0.5,
  })
  .pipe(
    Effect.catchTag('LLMError', () =>
      Effect.succeed({ object: { keyPoints: [] } }),
    ),
    Effect.catchTag('LLMRateLimitError', (error) =>
      Effect.fail(error),  // Let rate limit bubble up
    ),
  );
```

## Verification Log

<!-- Agent writes verification results here -->
