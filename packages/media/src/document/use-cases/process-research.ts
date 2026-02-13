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

/** Max total polling time: 60 minutes (Google's documented max for Deep Research) */
const MAX_POLL_DURATION_MS = 60 * 60 * 1000;

/** Backoff: 30s for first poll, then 60s thereafter */
const INITIAL_POLL_MS = 30_000;
const STEADY_POLL_MS = 60_000;

export const processResearch = (input: ProcessResearchInput) =>
  Effect.gen(function* () {
    const { documentId, query } = input;
    const research = yield* DeepResearch;
    const documentRepo = yield* DocumentRepo;
    const storage = yield* Storage;

    // 1. Check if we can resume an existing research operation
    const doc = yield* documentRepo.findById(documentId);
    const canResume =
      doc.researchConfig?.operationId &&
      doc.researchConfig?.researchStatus === 'in_progress';

    let interactionId: string;
    if (canResume) {
      interactionId = doc.researchConfig!.operationId!;
      yield* Effect.logInfo(
        `Resuming polling for existing operation ${interactionId}`,
      );
    } else {
      // Start a new research operation
      const result = yield* research.startResearch(query);
      interactionId = result.interactionId;

      // Update document with interaction ID
      yield* documentRepo.updateResearchConfig(documentId, {
        query,
        operationId: interactionId,
        researchStatus: 'in_progress',
      });
    }

    // 3. Poll for result: 30s first, then every 60s
    let elapsed = 0;
    let attempt = 1;
    let result = yield* research.getResult(interactionId);
    yield* Effect.logInfo(
      `Poll attempt ${attempt}: status=${result === null ? 'in_progress' : 'completed'} (elapsed: 0s)`,
    );

    while (result === null && elapsed < MAX_POLL_DURATION_MS) {
      const delay = elapsed === 0 ? INITIAL_POLL_MS : STEADY_POLL_MS;
      yield* Effect.sleep(delay);
      elapsed += delay;
      attempt += 1;
      result = yield* research.getResult(interactionId);
      yield* Effect.logInfo(
        `Poll attempt ${attempt}: status=${result === null ? 'in_progress' : 'completed'} (elapsed: ${Math.round(elapsed / 1000)}s)`,
      );
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
        'Research timed out after 60 minutes',
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
        Effect.gen(function* () {
          const repo = yield* DocumentRepo;
          yield* repo
            .updateStatus(
              input.documentId,
              DocumentStatus.FAILED,
              String(error),
            )
            .pipe(Effect.ignore);
          return yield* Effect.fail(error);
        }),
    ),
    Effect.withSpan('useCase.processResearch', {
      attributes: {
        'document.id': input.documentId,
        'document.query': input.query,
      },
    }),
  );
