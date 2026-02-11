import { ImageGen, LLM } from '@repo/ai';
import { InfographicStatus } from '@repo/db/schema';
import { InfographicRepo, syncEntityTitle } from '@repo/media';
import {
  buildInfographicPrompt,
  extractDocumentContent,
  formatExtractedContent,
} from '@repo/media/infographic/prompts';
import { JobProcessingError, formatError } from '@repo/queue';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import type {
  GenerateInfographicPayload,
  GenerateInfographicResult,
  Job,
} from '@repo/queue';

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
    Effect.withSpan('worker.generateInfographicTitle'),
  );

export const handleGenerateInfographic = (
  job: Job<GenerateInfographicPayload>,
) =>
  Effect.gen(function* () {
    const { infographicId } = job.payload;

    const repo = yield* InfographicRepo;
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;

    const infographic = yield* repo.findById(infographicId);

    const existingVersions = yield* repo.listVersions(infographicId);
    const latestVersion =
      existingVersions.length > 0
        ? existingVersions.reduce((a, b) =>
            a.versionNumber > b.versionNumber ? a : b,
          )
        : null;

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
          storage.delete(storageKey).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.flatMap(() => Effect.fail(err)),
          ),
        ),
      );

    const userPrompt = infographic.prompt ?? '';
    const isFirstVersion = !isEdit;
    const isUntitled = infographic.title === 'Untitled Infographic';
    const title =
      isFirstVersion && isUntitled && (userPrompt.length > 0 || documentContent)
        ? yield* generateTitle(userPrompt, infographic.title, documentContent)
        : infographic.title;

    yield* repo.update(infographicId, {
      status: InfographicStatus.READY,
      imageStorageKey: storageKey,
      errorMessage: null,
      ...(title !== infographic.title ? { title } : {}),
    });

    if (title !== infographic.title) {
      yield* syncEntityTitle(infographicId, title);
    }

    yield* repo.deleteOldVersions(infographicId, 10);

    return {
      infographicId,
      imageUrl,
      versionNumber: nextVersion,
    } satisfies GenerateInfographicResult;
  }).pipe(
    Effect.catchTag('ImageGenContentFilteredError', (err) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(`Content filtered: ${err.message}`);
        const repo = yield* InfographicRepo;
        yield* repo
          .update(job.payload.infographicId, {
            status: InfographicStatus.FAILED,
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
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Infographic generation failed: ${formatError(error)}`,
        );
        const repo = yield* InfographicRepo;
        yield* repo
          .update(job.payload.infographicId, {
            status: InfographicStatus.FAILED,
            errorMessage: 'Generation failed. Please try again.',
          })
          .pipe(Effect.catchAll(() => Effect.void));
        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Failed to generate infographic: ${formatError(error)}`,
            cause: error,
          }),
        );
      }),
    ),
    Effect.withSpan('worker.handleGenerateInfographic', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'infographic.id': job.payload.infographicId,
      },
    }),
  );
