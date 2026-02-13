import { Data, Effect } from 'effect';
import { DocumentRepo } from '../repos';

export class DocumentsNotReadyTimeout extends Data.TaggedError(
  'DocumentsNotReadyTimeout',
)<{
  readonly documentIds: readonly string[];
}> {}

export interface AwaitDocumentsReadyInput {
  documentIds: readonly string[];
}

/** Max total polling time: 65 minutes (slightly beyond research's 60min max) */
const MAX_POLL_DURATION_MS = 65 * 60 * 1000;

/** Poll interval: 30 seconds */
const POLL_INTERVAL_MS = 30_000;

export const awaitDocumentsReady = (input: AwaitDocumentsReadyInput) =>
  Effect.gen(function* () {
    const { documentIds } = input;
    if (documentIds.length === 0) return;

    const documentRepo = yield* DocumentRepo;

    // Check initial status
    let attempt = 1;
    let docs = yield* Effect.forEach(documentIds, (id) =>
      documentRepo.findById(id),
    );

    yield* Effect.logInfo(
      `Poll attempt ${attempt}: ${docs.map((d) => `${d.title}=${d.status}`).join(', ')}`,
    );

    // If all ready, return immediately
    if (docs.every((d) => d.status === 'ready')) return;

    // If any failed, fail immediately
    const failed = docs.find((d) => d.status === 'failed');
    if (failed) {
      return yield* Effect.fail(
        new DocumentsNotReadyTimeout({
          documentIds,
        }),
      );
    }

    // Poll until all ready
    let elapsed = 0;
    while (elapsed < MAX_POLL_DURATION_MS) {
      yield* Effect.sleep(POLL_INTERVAL_MS);
      elapsed += POLL_INTERVAL_MS;
      attempt += 1;

      docs = yield* Effect.forEach(documentIds, (id) =>
        documentRepo.findById(id),
      );

      yield* Effect.logInfo(
        `Poll attempt ${attempt}: ${docs.map((d) => `${d.title}=${d.status}`).join(', ')} (elapsed: ${Math.round(elapsed / 1000)}s)`,
      );

      if (docs.every((d) => d.status === 'ready')) return;

      const failedDoc = docs.find((d) => d.status === 'failed');
      if (failedDoc) {
        return yield* Effect.fail(
          new DocumentsNotReadyTimeout({
            documentIds,
          }),
        );
      }
    }

    return yield* new DocumentsNotReadyTimeout({ documentIds });
  }).pipe(
    Effect.withSpan('useCase.awaitDocumentsReady', {
      attributes: {
        'document.ids': input.documentIds.join(','),
      },
    }),
  );
