import { DeepResearch } from '@repo/ai';
import { DocumentStatus } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Data, Effect } from 'effect';
import { DocumentRepo } from '../repos';
import { calculateContentHash } from '../services/content-utils';

export class ResearchTimeoutError extends Data.TaggedError(
  'ResearchTimeoutError',
)<{
  readonly documentId: string;
  readonly interactionId: string;
}> {}

export class ResearchEmptyContentError extends Data.TaggedError(
  'ResearchEmptyContentError',
)<{
  readonly documentId: string;
  readonly interactionId: string;
}> {}

export interface ProcessResearchInput {
  documentId: string;
  query: string;
}

/** Max total polling time: 10 minutes */
const MAX_POLL_DURATION_MS = 10 * 60 * 1000;

/** Backoff schedule in milliseconds: 5s, 10s, 20s, 30s (capped) */
const BACKOFF_SCHEDULE: number[] = [5_000, 10_000, 20_000, 30_000];

function getBackoffDelay(attempt: number): number {
  return attempt < BACKOFF_SCHEDULE.length
    ? BACKOFF_SCHEDULE[attempt]!
    : BACKOFF_SCHEDULE[BACKOFF_SCHEDULE.length - 1]!;
}

export const processResearch = (input: ProcessResearchInput) =>
  Effect.gen(function* () {
    const { documentId, query } = input;
    const research = yield* DeepResearch;
    const documentRepo = yield* DocumentRepo;
    const storage = yield* Storage;

    // 1. Start the research
    const { interactionId } = yield* research.startResearch(query);

    // 2. Update document with interaction ID
    yield* documentRepo.updateResearchConfig(documentId, {
      query,
      operationId: interactionId,
      researchStatus: 'in_progress',
    });

    // 3. Poll for result with exponential backoff
    let attempt = 0;
    let elapsed = 0;
    let result = yield* research.getResult(interactionId);

    while (result === null && elapsed < MAX_POLL_DURATION_MS) {
      const delay = getBackoffDelay(attempt);
      yield* Effect.sleep(delay);
      elapsed += delay;
      attempt++;
      result = yield* research.getResult(interactionId);
    }

    if (result === null) {
      yield* documentRepo.updateResearchConfig(documentId, {
        query,
        operationId: interactionId,
        researchStatus: 'failed',
      });
      yield* documentRepo.updateStatus(
        documentId,
        DocumentStatus.FAILED,
        'Research timed out after 10 minutes',
      );
      return yield* new ResearchTimeoutError({ documentId, interactionId });
    }

    if (!result.content.trim()) {
      yield* documentRepo.updateResearchConfig(documentId, {
        query,
        operationId: interactionId,
        researchStatus: 'failed',
      });
      yield* documentRepo.updateStatus(
        documentId,
        DocumentStatus.FAILED,
        'Research completed but returned no content',
      );
      return yield* new ResearchEmptyContentError({
        documentId,
        interactionId,
      });
    }

    yield* Effect.logInfo(
      `Research produced ${result.wordCount} words from ${result.sources.length} sources`,
    );

    // 4. Upload content to storage
    const contentKey = `documents/${documentId}/content.txt`;
    yield* storage.upload(
      contentKey,
      Buffer.from(result.content, 'utf-8'),
      'text/plain',
    );

    // 5. Compute content hash
    const contentHash = yield* calculateContentHash(result.content);

    // 6. Update document content
    yield* documentRepo.updateContent(documentId, {
      contentKey,
      extractedText: result.content,
      contentHash,
      wordCount: result.wordCount,
    });

    // 7. Update research config with completion status + structured sources
    yield* documentRepo.updateResearchConfig(documentId, {
      query,
      operationId: interactionId,
      researchStatus: 'completed',
      sourceCount: result.sources.length,
      sources: result.sources.map((s) => ({ title: s.title, url: s.url })),
    });

    // 8. Mark document as ready
    yield* documentRepo.updateStatus(documentId, DocumentStatus.READY);

    return { documentId, wordCount: result.wordCount };
  }).pipe(
    Effect.catchIf(
      (
        error,
      ): error is Exclude<
        typeof error,
        ResearchTimeoutError | ResearchEmptyContentError
      > =>
        !(error instanceof ResearchTimeoutError) &&
        !(error instanceof ResearchEmptyContentError),
      (error) =>
        DocumentRepo.pipe(
          Effect.flatMap((repo) =>
            repo
              .updateStatus(
                input.documentId,
                DocumentStatus.FAILED,
                String(error),
              )
              .pipe(Effect.catchAll(() => Effect.void)),
          ),
          Effect.flatMap(() => Effect.fail(error)),
        ),
    ),
    Effect.withSpan('useCase.processResearch', {
      attributes: {
        'document.id': input.documentId,
        'document.query': input.query,
      },
    }),
  );
