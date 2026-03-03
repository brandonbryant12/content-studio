import { DocumentStatus } from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { DocumentRepo } from '../repos';

export class DocumentsNotReadyTimeout extends Schema.TaggedError<DocumentsNotReadyTimeout>()(
  'DocumentsNotReadyTimeout',
  {
    documentIds: Schema.Array(Schema.String),
  },
) {
  static readonly httpStatus = 504 as const;
  static readonly httpCode = 'DOCUMENTS_NOT_READY_TIMEOUT' as const;
  static readonly httpMessage = 'Documents did not reach ready state in time';
  static readonly logLevel = 'warn' as const;
  static getData(e: DocumentsNotReadyTimeout) {
    return { documentIds: [...e.documentIds] };
  }
}

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
    const failNotReady = () =>
      Effect.fail(new DocumentsNotReadyTimeout({ documentIds }));
    const fetchDocs = () =>
      Effect.forEach(documentIds, (id) => documentRepo.findById(id));
    const formatPollStatus = (
      docs: ReadonlyArray<{ title: string; status: string }>,
    ) => docs.map((doc) => `${doc.title}=${doc.status}`).join(', ');

    // Check initial status
    let attempt = 1;
    let docs = yield* fetchDocs();

    const primaryId = documentIds[0];
    if (!primaryId) {
      return yield* Effect.die('Expected at least one document ID');
    }

    const firstDoc = docs[0];
    if (!firstDoc) {
      return yield* Effect.die('Expected at least one document to be loaded');
    }

    yield* annotateUseCaseSpan({
      userId: firstDoc.createdBy,
      resourceId: primaryId,
      attributes: {
        'document.ids': documentIds.join(','),
      },
    });
    yield* Effect.logInfo(`Poll attempt ${attempt}: ${formatPollStatus(docs)}`);

    // If all ready, return immediately
    if (docs.every((d) => d.status === DocumentStatus.READY)) return;

    // If any failed, fail immediately
    const failed = docs.find((d) => d.status === DocumentStatus.FAILED);
    if (failed) {
      return yield* failNotReady();
    }

    // Poll until all ready
    let elapsed = 0;
    while (elapsed < MAX_POLL_DURATION_MS) {
      yield* Effect.sleep(POLL_INTERVAL_MS);
      elapsed += POLL_INTERVAL_MS;
      attempt += 1;

      docs = yield* fetchDocs();

      yield* Effect.logInfo(
        `Poll attempt ${attempt}: ${formatPollStatus(docs)} (elapsed: ${Math.round(elapsed / 1000)}s)`,
      );

      if (docs.every((d) => d.status === DocumentStatus.READY)) return;

      const failedDoc = docs.find((d) => d.status === DocumentStatus.FAILED);
      if (failedDoc) {
        return yield* failNotReady();
      }
    }

    return yield* failNotReady();
  }).pipe(withUseCaseSpan('useCase.awaitDocumentsReady'));
