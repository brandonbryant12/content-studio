import {
  ImageGen,
  LLM,
  infographicLayoutUserPrompt,
  infographicTitleUserPrompt,
  renderPrompt,
} from '@repo/ai';
import {
  InfographicLayoutSchema,
  InfographicStatus,
  type Infographic,
  type StyleProperty,
} from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import { logActivity } from '../../activity';
import { syncEntityTitle } from '../../activity';
import {
  annotateUseCaseSpan,
  runSchemaContractWithRetries,
  withUseCaseSpan,
} from '../../shared';
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
      prompt: renderPrompt(infographicTitleUserPrompt, { sourcePrompt }),
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

const generateLayout = (input: {
  prompt: string;
  format: Infographic['format'];
  styleProperties: readonly StyleProperty[];
  userId: string;
  infographicId: string;
  infographicTitle: string;
}) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    const { object } = yield* runSchemaContractWithRetries({
      maxAttempts: 3,
      run: () =>
        llm.generate({
          prompt: renderPrompt(infographicLayoutUserPrompt, {
            prompt: input.prompt,
            format: input.format,
            styleProperties: input.styleProperties,
          }),
          schema: InfographicLayoutSchema,
          temperature: 0.2,
        }),
      onAttemptError: ({ attempt, maxAttempts, error, willRetry }) =>
        logActivity({
          userId: input.userId,
          action: willRetry
            ? 'schema-validation-retry'
            : 'schema-validation-failed',
          entityType: 'infographic',
          entityId: input.infographicId,
          entityTitle: input.infographicTitle,
          metadata: {
            contract: 'infographic.layout',
            attempt,
            maxAttempts,
            errorTag:
              typeof error === 'object' &&
              error !== null &&
              '_tag' in error &&
              typeof error._tag === 'string'
                ? error._tag
                : 'UnknownError',
          },
        }).pipe(Effect.catchAll(() => Effect.void)),
    });

    return object;
  }).pipe(Effect.withSpan('infographic.generateLayout'));

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
    yield* annotateUseCaseSpan({
      userId: infographic.createdBy,
      resourceId: infographicId,
      attributes: { 'infographic.id': infographicId },
    });

    const existingVersions = yield* repo.listVersions(infographicId);
    const latestVersion = existingVersions.at(-1) ?? null;
    const originalQueryPrompt = selectOriginalTitlePrompt({
      currentPrompt: infographic.prompt ?? null,
      existingVersions,
    });

    const isEdit = latestVersion !== null;
    const layout = yield* generateLayout({
      prompt: infographic.prompt ?? 'Create an infographic',
      format: infographic.format,
      styleProperties: infographic.styleProperties ?? [],
      userId: infographic.createdBy,
      infographicId,
      infographicTitle: infographic.title,
    });

    const prompt = buildInfographicPrompt({
      styleProperties: infographic.styleProperties ?? [],
      format: infographic.format,
      prompt: infographic.prompt ?? 'Create an infographic',
      isEdit,
      layout,
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
        layout,
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
      ? (layout.title.trim().length > 0
          ? layout.title.trim()
          : yield* generateTitle(originalQueryPrompt))
      : infographic.title;

    yield* repo.update(infographicId, {
      title,
      layout,
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
    withUseCaseSpan('useCase.executeInfographicGeneration'),
  );
