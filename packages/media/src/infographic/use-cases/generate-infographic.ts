import { Effect } from 'effect';
import { Image, type ImageError, type ImageQuotaExceededError } from '@repo/ai';
import { Storage } from '@repo/storage';
import type { InfographicGenerationContext } from '@repo/db/schema';
import { InfographicRepo } from '../repos/infographic-repo';
import { SelectionRepo } from '../repos/selection-repo';
import { DocumentRepo } from '../../document/repos/document-repo';
import { buildInfographicPrompt, type InfographicType } from '../prompts';
import {
  InfographicNotFound,
  InvalidInfographicGeneration,
} from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface GenerateInfographicInput {
  infographicId: string;
}

export interface GenerateInfographicResult {
  infographicId: string;
  imageUrl: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Generate an infographic image.
 *
 * This use case is called by the worker and:
 * 1. Validates infographic exists and has selections
 * 2. Updates status to generating
 * 3. Builds prompt from selections + type + instructions
 * 4. Calls Image service to generate the infographic
 * 5. Uploads result to storage
 * 6. Stores generation context for audit
 * 7. Updates infographic with imageUrl and ready status
 *
 * On failure, updates status to 'failed' with error message.
 *
 * @example
 * const result = yield* generateInfographic({ infographicId: 'inf_123' });
 * // result.imageUrl
 */
export const generateInfographic = (input: GenerateInfographicInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;
    const documentRepo = yield* DocumentRepo;
    const image = yield* Image;
    const storage = yield* Storage;

    // 1. Get infographic
    const infographic = yield* infographicRepo
      .findById(input.infographicId)
      .pipe(
        Effect.catchTag('InfographicNotFound', () =>
          Effect.fail(new InfographicNotFound({ id: input.infographicId })),
        ),
      );

    // 2. Update status to generating
    yield* infographicRepo.updateStatus(infographic.id, 'generating');

    // 3. Get selections
    const selections = yield* selectionRepo.findByInfographic(infographic.id);

    if (selections.length === 0) {
      yield* infographicRepo.updateStatus(
        infographic.id,
        'failed',
        'No content selected',
      );
      return yield* Effect.fail(
        new InvalidInfographicGeneration({
          infographicId: input.infographicId,
          reason: 'No content selected',
        }),
      );
    }

    // 4. Get document titles for prompt context
    const documentTitles = new Map<string, string>();
    for (const docId of infographic.sourceDocumentIds) {
      const doc = yield* documentRepo
        .findById(docId)
        .pipe(Effect.catchTag('DocumentNotFound', () => Effect.succeed(null)));
      if (doc) {
        documentTitles.set(docId, doc.title);
      }
    }

    // 5. Build prompt
    const prompt = buildInfographicPrompt({
      type: infographic.infographicType as InfographicType,
      selections: selections.map((s) => ({
        text: s.selectedText,
        documentTitle: documentTitles.get(s.documentId) ?? undefined,
      })),
      customInstructions: infographic.customInstructions ?? undefined,
      feedbackInstructions: infographic.feedbackInstructions ?? undefined,
      aspectRatio: infographic.aspectRatio,
    });

    // 6. Generate image
    const imageResult = yield* image
      .generate({
        prompt,
        aspectRatio: infographic.aspectRatio as
          | '1:1'
          | '16:9'
          | '9:16'
          | '4:3'
          | '3:4'
          | '21:9',
      })
      .pipe(
        Effect.catchAll((error: ImageError | ImageQuotaExceededError) =>
          // On image generation failure, mark as failed and re-throw
          Effect.gen(function* () {
            yield* infographicRepo.updateStatus(
              infographic.id,
              'failed',
              error.message,
            );
            return yield* Effect.fail(error);
          }),
        ),
      );

    // 7. Upload to storage
    const fileName = `infographics/${infographic.id}/${Date.now()}.png`;
    yield* storage.upload(
      fileName,
      imageResult.imageContent,
      imageResult.mimeType,
    );

    const imageUrl = yield* storage.getUrl(fileName);

    // 8. Store generation context for audit
    const generationContext: InfographicGenerationContext = {
      promptUsed: prompt,
      selectionsAtGeneration: selections.map((s) => ({
        id: s.id,
        text: s.selectedText,
        documentId: s.documentId,
      })),
      modelId: 'gemini-2.5-flash-image',
      aspectRatio: infographic.aspectRatio,
      generatedAt: new Date().toISOString(),
    };

    yield* infographicRepo.updateGenerationContext(
      infographic.id,
      generationContext,
    );

    // 9. Update with image URL and ready status
    yield* infographicRepo.updateImage(infographic.id, imageUrl);
    yield* infographicRepo.updateStatus(infographic.id, 'ready');

    return {
      infographicId: infographic.id,
      imageUrl,
    };
  }).pipe(
    Effect.withSpan('useCase.generateInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
