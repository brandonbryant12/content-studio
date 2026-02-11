import {
  generateDocumentId,
  type DocumentId,
  type Document,
  type DocumentSource,
  type DocumentStatus,
  type ResearchConfig,
} from '@repo/db/schema';

export interface CreateTestDocumentOptions {
  id?: DocumentId;
  title?: string;
  contentKey?: string;
  mimeType?: string;
  wordCount?: number;
  source?: DocumentSource;
  originalFileName?: string | null;
  originalFileSize?: number | null;
  metadata?: Record<string, unknown> | null;
  status?: DocumentStatus;
  errorMessage?: string | null;
  sourceUrl?: string | null;
  researchConfig?: ResearchConfig | null;
  jobId?: string | null;
  extractedText?: string | null;
  contentHash?: string | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let documentCounter = 0;

export function createTestDocument(
  options: CreateTestDocumentOptions = {},
): Document {
  documentCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateDocumentId(),
    title: options.title ?? `Test Document ${documentCounter}`,
    contentKey: options.contentKey ?? `documents/test-${documentCounter}.txt`,
    mimeType: options.mimeType ?? 'text/plain',
    wordCount: options.wordCount ?? 100,
    source: options.source ?? 'manual',
    originalFileName: options.originalFileName ?? null,
    originalFileSize: options.originalFileSize ?? null,
    metadata: options.metadata ?? null,
    status: options.status ?? 'ready',
    errorMessage: options.errorMessage ?? null,
    sourceUrl: options.sourceUrl ?? null,
    researchConfig: options.researchConfig ?? null,
    jobId: options.jobId ?? null,
    extractedText: options.extractedText ?? null,
    contentHash: options.contentHash ?? null,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

export function createTestPdfDocument(
  options: Omit<CreateTestDocumentOptions, 'source' | 'mimeType'> = {},
): Document {
  return createTestDocument({
    ...options,
    source: 'upload_pdf',
    mimeType: 'application/pdf',
    originalFileName: options.originalFileName ?? 'document.pdf',
    originalFileSize: options.originalFileSize ?? 50000,
  });
}

export function resetDocumentCounter() {
  documentCounter = 0;
}
