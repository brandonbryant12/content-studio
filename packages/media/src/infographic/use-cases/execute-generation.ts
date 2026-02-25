import {
  ImageGen,
  LLM,
  LLMError,
  LLMRateLimitError,
  infographicTitleUserPrompt,
  renderPrompt,
} from '@repo/ai';
import { InfographicStatus, type StyleProperty } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect, Option, Schema, Schedule } from 'effect';
import { syncEntityTitle } from '../../activity';
import { ActivityLogRepo } from '../../activity/repos/activity-log-repo';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

const InfographicLayoutSectionSchema = Schema.Struct({
  heading: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  keyPoints: Schema.Array(Schema.String).pipe(
    Schema.minItems(2),
    Schema.maxItems(6),
  ),
  visualType: Schema.Literal(
    'timeline',
    'comparison',
    'stats',
    'process',
    'callout',
  ),
});

const InfographicLayoutPlanSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(120)),
  objective: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(240)),
  sections: Schema.Array(InfographicLayoutSectionSchema).pipe(
    Schema.minItems(3),
    Schema.maxItems(8),
  ),
  callToAction: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(120)),
  ),
});

const stringifyStyleProperties = (styleProperties: readonly StyleProperty[]) => {
  if (styleProperties.length === 0) {
    return 'None';
  }
  return styleProperties
    .map((property) => {
      const key = property.key.trim();
      const value = property.value.trim();
      if (!key || !value) {
        return null;
      }
      return property.type
        ? `${key}: ${value} (${property.type})`
        : `${key}: ${value}`;
    })
    .filter((entry): entry is string => entry !== null)
    .join('\n');
};

const renderLayoutPlan = (
  layout: typeof InfographicLayoutPlanSchema.Type,
): string => {
  const sectionLines = layout.sections.map((section, index) => {
    const keyPoints = section.keyPoints.map((point) => `- ${point}`).join('\n');
    return `${index + 1}. ${section.heading} (${section.visualType})\n${keyPoints}`;
  });

  const callToActionLine = layout.callToAction
    ? `\nCall to action: ${layout.callToAction}`
    : '';

  return [
    `Layout title: ${layout.title}`,
    `Objective: ${layout.objective}`,
    'Sections:',
    sectionLines.join('\n'),
    callToActionLine,
  ]
    .filter((line) => line.length > 0)
    .join('\n');
};

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

const generateLayoutPlan = (input: {
  sourcePrompt: string;
  styleProperties: readonly StyleProperty[];
  format: string;
}) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    const { object } = yield* llm
      .generate({
        system:
          'Design an infographic layout blueprint as structured JSON. Keep sections concise and execution-ready for image generation.',
        prompt: [
          `User request: ${input.sourcePrompt}`,
          `Format: ${input.format}`,
          `Style properties:\n${stringifyStyleProperties(input.styleProperties)}`,
          'Return a layout plan that can be rendered directly by downstream image generation.',
        ].join('\n\n'),
        schema: InfographicLayoutPlanSchema,
        maxTokens: 900,
        temperature: 0.2,
      })
      .pipe(
        Effect.retry({
          times: 2,
          schedule: Schedule.exponential('400 millis'),
          while: (error) => error._tag === 'LLMError',
        }),
      );

    return object;
  }).pipe(Effect.withSpan('infographic.generateLayoutPlan'));

const logSchemaValidationFailure = (input: {
  userId: string;
  infographicId: string;
  title: string;
  errorTag: string;
  message: string;
}) =>
  Effect.gen(function* () {
    const repoOption = yield* Effect.serviceOption(ActivityLogRepo);
    if (Option.isNone(repoOption)) {
      return;
    }

    yield* repoOption.value.insert({
      userId: input.userId,
      action: 'schema_validation_failed',
      entityType: 'infographic',
      entityId: input.infographicId,
      entityTitle: input.title,
      metadata: {
        step: 'infographic_layout',
        retries: 2,
        errorTag: input.errorTag,
        message: input.message,
      },
    });
  }).pipe(Effect.catchAll(() => Effect.void));

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
    const sourcePrompt = infographic.prompt ?? 'Create an infographic';
    const layoutPlan = yield* generateLayoutPlan({
      sourcePrompt,
      styleProperties: infographic.styleProperties ?? [],
      format: infographic.format,
    });
    const promptWithLayout = `${sourcePrompt}\n\nStructured layout blueprint:\n${renderLayoutPlan(layoutPlan)}`;
    const prompt = buildInfographicPrompt({
      styleProperties: infographic.styleProperties ?? [],
      format: infographic.format,
      prompt: promptWithLayout,
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
    Effect.catchIf(
      (
        error,
      ): error is LLMError | LLMRateLimitError =>
        error instanceof LLMError || error instanceof LLMRateLimitError,
      (error) =>
        Effect.gen(function* () {
          const repo = yield* InfographicRepo;
          const infographic = yield* repo.findById(input.infographicId).pipe(
            Effect.catchAll(() => Effect.succeed(null)),
          );
          yield* repo
            .update(input.infographicId, {
              status: InfographicStatus.FAILED,
              errorMessage:
                'Structured layout validation failed after retries. Please adjust your prompt and try again.',
            })
            .pipe(Effect.catchAll(() => Effect.void));

          if (infographic) {
            yield* logSchemaValidationFailure({
              userId: infographic.createdBy,
              infographicId: infographic.id,
              title: infographic.title,
              errorTag: error._tag,
              message: error.message,
            });
          }

          return yield* Effect.fail(error);
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
