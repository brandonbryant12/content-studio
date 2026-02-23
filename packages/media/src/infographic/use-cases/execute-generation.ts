import { ImageGen, LLM } from '@repo/ai';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicStatus } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import { syncEntityTitle } from '../../activity';
import { annotateUseCaseSpan } from '../../shared';
import { buildInfographicPrompt } from '../prompts';
import { InfographicRepo } from '../repos';
import {
  resolveInfographicTitle,
  selectOriginalTitlePrompt,
  buildFallbackInfographicTitle,
  UNTITLED_INFOGRAPHIC_TITLE,
} from './title-utils';

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
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
});

const generateTitle = (sourcePrompt: string) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    // Keep title generation cheap: short, low-temperature structured call.
    const { object } = yield* llm.generate({
      prompt: `Generate a short infographic title (3-6 words) from this source query: "${sourcePrompt}"`,
      schema: TitleSchema,
      maxTokens: 20,
      temperature: 0.2,
    });
    return resolveInfographicTitle(object.title, sourcePrompt);
  }).pipe(
    Effect.catchAll(() =>
      Effect.succeed(buildFallbackInfographicTitle(sourcePrompt)),
    ),
    Effect.withSpan('infographic.generateTitle'),
  );

// =============================================================================
// Use Case
// =============================================================================

export const executeInfographicGeneration = (input: ExecuteGenerationInput) =>
  Effect.gen(function* () {
    const { infographicId } = input;
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: infographicId,
    });

    const repo = yield* InfographicRepo;
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;

    const infographic = yield* repo.findById(infographicId);

    const existingVersions = yield* repo.listVersions(infographicId);
    const latestVersion = existingVersions.at(-1) ?? null;
    const originalQueryPrompt = selectOriginalTitlePrompt({
      currentPrompt: infographic.prompt ?? null,
      existingVersions,
    });

    const isEdit = latestVersion !== null;
    const prompt = buildInfographicPrompt({
      styleProperties: infographic.styleProperties ?? [],
      format: infographic.format,
      prompt: infographic.prompt ?? 'Create an infographic',
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
        styleProperties: infographic.styleProperties ?? [],
        format: infographic.format,
        imageStorageKey: storageKey,
      })
      .pipe(
        Effect.tapError(() => storage.delete(storageKey).pipe(Effect.ignore)),
      );

    const shouldGenerateTitle =
      infographic.title === UNTITLED_INFOGRAPHIC_TITLE &&
      originalQueryPrompt.length > 0;
    const title = shouldGenerateTitle
      ? yield* generateTitle(originalQueryPrompt)
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
