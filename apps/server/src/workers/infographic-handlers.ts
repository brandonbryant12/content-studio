import { InfographicRepo } from '@repo/media';
import { ImageGen, LLM } from '@repo/ai';
import { Storage } from '@repo/storage';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect, Schema } from 'effect';
import type {
  GenerateInfographicPayload,
  GenerateInfographicResult,
  Job,
} from '@repo/queue';
import {
  buildInfographicPrompt,
  extractDocumentContent,
  formatExtractedContent,
} from '@repo/media/infographic/prompts';

const TitleSchema = Schema.Struct({
  title: Schema.String,
});

/**
 * Generate a short, descriptive title for an infographic using LLM.
 * Falls back to the existing title if generation fails.
 */
const generateTitle = (
  prompt: string,
  currentTitle: string,
  documentContent?: string,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const context = documentContent
      ? `The infographic is based on source documents with this content:\n${documentContent}\n\nThe user's direction: "${prompt}"`
      : `The infographic is about: "${prompt}"`;
    const { object } = yield* llm.generate({
      prompt: `Generate a short, descriptive title (3-6 words) for an infographic. ${context}\n\nReturn only the title, no quotes or punctuation at the end.`,
      schema: TitleSchema,
      maxTokens: 30,
      temperature: 0.7,
    });
    return object.title;
  }).pipe(
    Effect.catchAll(() => Effect.succeed(currentTitle)),
    Effect.withSpan('worker.generateInfographicTitle'),
  );

/**
 * Handler for generate-infographic jobs.
 * Generates an image from the infographic prompt and stores it.
 *
 * Requires: InfographicRepo, ImageGen, Storage, LLM (for doc extraction), DocumentRepo
 */
export const handleGenerateInfographic = (
  job: Job<GenerateInfographicPayload>,
) =>
  Effect.gen(function* () {
    const { infographicId } = job.payload;

    const repo = yield* InfographicRepo;
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;

    // 1. Fetch infographic
    const infographic = yield* repo.findById(infographicId);

    // 2. Check for previous version (for iterative editing)
    const existingVersions = yield* repo.listVersions(infographicId);
    const latestVersion =
      existingVersions.length > 0
        ? existingVersions.reduce((a, b) =>
            a.versionNumber > b.versionNumber ? a : b,
          )
        : null;

    // 3. Extract document content (type-aware extraction)
    let documentContent: string | undefined;
    const sourceIds = infographic.sourceDocumentIds as string[] | null;
    if (sourceIds && sourceIds.length > 0) {
      const extracted = yield* extractDocumentContent(
        sourceIds,
        infographic.infographicType,
      );
      documentContent = formatExtractedContent(extracted);
    }

    // 4. Build prompt (edit mode when iterating on existing image)
    const isEdit = latestVersion !== null;
    const prompt = buildInfographicPrompt({
      infographicType: infographic.infographicType,
      stylePreset: infographic.stylePreset,
      format: infographic.format,
      prompt: infographic.prompt ?? 'Create an infographic',
      documentContent,
      isEdit,
    });

    // 5. Download previous image as reference for iterative editing
    const referenceImage = latestVersion
      ? yield* storage.download(latestVersion.imageStorageKey).pipe(
          Effect.map((data) => ({
            data,
            mimeType: latestVersion.imageStorageKey.endsWith('.png')
              ? 'image/png'
              : 'image/jpeg',
          })),
          Effect.catchAll(() => Effect.succeed(undefined)),
        )
      : undefined;

    // 6. Generate image
    const { imageData, mimeType } = yield* imageGen.generateImage({
      prompt,
      format: infographic.format,
      referenceImage,
    });

    // 7. Upload to storage
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const storageKey = `infographics/${infographicId}/${Date.now()}.${ext}`;
    const imageUrl = yield* storage.upload(storageKey, imageData, mimeType);

    // 8. Create version record
    const nextVersion =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
        : 1;

    yield* repo
      .insertVersion({
        infographicId: infographic.id,
        versionNumber: nextVersion,
        prompt: infographic.prompt ?? undefined,
        infographicType: infographic.infographicType,
        stylePreset: infographic.stylePreset,
        format: infographic.format,
        imageStorageKey: storageKey,
      })
      .pipe(
        Effect.catchAll((err) =>
          // Cleanup: delete uploaded image if DB insert fails
          storage.delete(storageKey).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.flatMap(() => Effect.fail(err)),
          ),
        ),
      );

    // 9. Generate a title on first iteration only
    const userPrompt = infographic.prompt ?? '';
    const isFirstVersion = !isEdit;
    const isUntitled = infographic.title === 'Untitled Infographic';
    const title =
      isFirstVersion && isUntitled && (userPrompt.length > 0 || documentContent)
        ? yield* generateTitle(userPrompt, infographic.title, documentContent)
        : infographic.title;

    // 10. Update infographic status to ready
    yield* repo.update(infographicId, {
      status: 'ready',
      imageStorageKey: storageKey,
      errorMessage: null,
      ...(title !== infographic.title ? { title } : {}),
    });

    // 11. Prune old versions (keep max 10)
    yield* repo.deleteOldVersions(infographicId, 10);

    return {
      infographicId,
      imageUrl,
      versionNumber: nextVersion,
    } satisfies GenerateInfographicResult;
  }).pipe(
    // Handle safety filter
    Effect.catchTag('ImageGenContentFilteredError', (err) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(`Content filtered: ${err.message}`);
        const repo = yield* InfographicRepo;
        yield* repo
          .update(job.payload.infographicId, {
            status: 'failed',
            errorMessage:
              'Your infographic could not be generated. Please adjust your prompt and try again.',
          })
          .pipe(Effect.catchAll(() => Effect.void));
        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Content filtered: ${err.message}`,
            cause: err,
          }),
        );
      }),
    ),
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      return Effect.gen(function* () {
        yield* Effect.logError(
          `Infographic generation failed: ${errorMessage}`,
        );
        const repo = yield* InfographicRepo;
        yield* repo
          .update(job.payload.infographicId, {
            status: 'failed',
            errorMessage: 'Generation failed. Please try again.',
          })
          .pipe(Effect.catchAll(() => Effect.void));
        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Failed to generate infographic: ${errorMessage}`,
            cause: error,
          }),
        );
      });
    }),
    Effect.withSpan('worker.handleGenerateInfographic', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'infographic.id': job.payload.infographicId,
      },
    }),
  );
