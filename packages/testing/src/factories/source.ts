import {
  generateSourceId,
  type SourceId,
  type Source,
  type SourceOrigin,
  type SourceStatus,
  type JsonValue,
  type ResearchConfig,
} from '@repo/db/schema';

export interface CreateTestSourceOptions {
  id?: SourceId;
  title?: string;
  contentKey?: string;
  mimeType?: string;
  wordCount?: number;
  source?: SourceOrigin;
  originalFileName?: string | null;
  originalFileSize?: number | null;
  metadata?: Record<string, JsonValue> | null;
  status?: SourceStatus;
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

let sourceCounter = 0;

export function createTestSource(
  options: CreateTestSourceOptions = {},
): Source {
  sourceCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateSourceId(),
    title: options.title ?? `Test Source ${sourceCounter}`,
    contentKey: options.contentKey ?? `sources/test-${sourceCounter}.txt`,
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

export function createTestPdfSource(
  options: Omit<CreateTestSourceOptions, 'source' | 'mimeType'> = {},
): Source {
  return createTestSource({
    ...options,
    source: 'upload_pdf',
    mimeType: 'application/pdf',
    originalFileName: options.originalFileName ?? 'source.pdf',
    originalFileSize: options.originalFileSize ?? 50000,
  });
}

export function resetSourceCounter() {
  sourceCounter = 0;
}
