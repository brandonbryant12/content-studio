import { ImageGen, LLM } from '@repo/ai';
import { InfographicStatus } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import { syncEntityTitle } from '../../activity';
import {
  buildInfographicPrompt,
  extractDocumentContent,
  formatExtractedContent,
} from '../prompts';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ExecuteGenerationInput {
  infographicId: string;
}

export interface ExecuteGenerationResult {
  infographicId: string;
  imageUrl: string;
  versionNumber: number;
}

// =============================================================================
// Helpers
// =============================================================================

const TitleSchema = Schema.Struct({
  title: Schema.String,
});

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
    Effect.withSpan('infographic.generateTitle'),
  );

// =============================================================================
// Use Case
// =============================================================================

export const executeInfographicGeneration = (input: ExecuteGenerationInput) =>
  Effect.gen(function* () {
    const { infographicId } = input;

    const repo = yield* InfographicRepo;
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;

    const infographic = yield* repo.findById(infographicId);

    const existingVersions = yield* repo.listVersions(infographicId);
    const latestVersion = existingVersions.at(-1) ?? null;

    let documentContent: string | undefined;
    const sourceIds = infographic.sourceDocumentIds as string[] | null;
    if (sourceIds && sourceIds.length > 0) {
      const extracted = yield* extractDocumentContent(
        sourceIds,
        infographic.infographicType,
      );
      documentContent = formatExtractedContent(extracted);
    }

    const isEdit = latestVersion !== null;
    const prompt = buildInfographicPrompt({
      infographicType: infographic.infographicType,
      stylePreset: infographic.stylePreset,
      format: infographic.format,
      prompt: infographic.prompt ?? 'Create an infographic',
      documentContent,
      isEdit,
    });

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

    const { imageData, mimeType } = yield* imageGen.generateImage({
      prompt,
      format: infographic.format,
      referenceImage,
    });

    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const storageKey = `infographics/${infographicId}/${Date.now()}.${ext}`;
    const imageUrl = yield* storage.upload(storageKey, imageData, mimeType);

    const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

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
        Effect.tapError(() => storage.delete(storageKey).pipe(Effect.ignore)),
      );

    const userPrompt = infographic.prompt ?? '';
    const shouldGenerateTitle =
      !isEdit &&
      infographic.title === 'Untitled Infographic' &&
      (userPrompt.length > 0 || documentContent);
    const title = shouldGenerateTitle
      ? yield* generateTitle(userPrompt, infographic.title, documentContent)
      : infographic.title;

    yield* repo.update(infographicId, {
      title,
      status: InfographicStatus.READY,
      imageStorageKey: storageKey,
      errorMessage: null,
    });

    if (title !== infographic.title) {
      yield* syncEntityTitle(infographicId, title);
    }

    yield* repo.deleteOldVersions(infographicId, 10);

    return {
      infographicId,
      imageUrl,
      versionNumber: nextVersion,
    } satisfies ExecuteGenerationResult;
  }).pipe(
    Effect.catchTag('ImageGenContentFilteredError', (err) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(`Content filtered: ${err.message}`);
        const repo = yield* InfographicRepo;
        yield* repo
          .update(input.infographicId, {
            status: InfographicStatus.FAILED,
            errorMessage:
              'Your infographic could not be generated. Please adjust your prompt and try again.',
          })
          .pipe(Effect.catchAll(() => Effect.void));
        return yield* Effect.fail(err);
      }),
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Infographic generation failed: ${String(error)}`,
        );
        const repo = yield* InfographicRepo;
        yield* repo
          .update(input.infographicId, {
            status: InfographicStatus.FAILED,
            errorMessage: 'Generation failed. Please try again.',
          })
          .pipe(Effect.catchAll(() => Effect.void));
        return yield* Effect.fail(error);
      }),
    ),
    Effect.withSpan('useCase.executeInfographicGeneration', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
