import { randomUUID } from 'crypto';
import type { Document, DocumentSource } from '@repo/db/schema';

/**
 * Options for creating a test document.
 */
export interface CreateTestDocumentOptions {
  id?: string;
  title?: string;
  contentKey?: string;
  mimeType?: string;
  wordCount?: number;
  source?: DocumentSource;
  originalFileName?: string | null;
  originalFileSize?: number | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let documentCounter = 0;

/**
 * Create a test document with default values.
 */
export const createTestDocument = (
  options: CreateTestDocumentOptions = {},
): Document => {
  documentCounter++;
  const now = new Date();

  return {
    id: options.id ?? randomUUID(),
    title: options.title ?? `Test Document ${documentCounter}`,
    contentKey: options.contentKey ?? `documents/test-${documentCounter}.txt`,
    mimeType: options.mimeType ?? 'text/plain',
    wordCount: options.wordCount ?? 100,
    source: options.source ?? 'manual',
    originalFileName: options.originalFileName ?? null,
    originalFileSize: options.originalFileSize ?? null,
    metadata: options.metadata ?? null,
    createdBy: options.createdBy ?? randomUUID(),
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test document from a PDF upload.
 */
export const createTestPdfDocument = (
  options: Omit<CreateTestDocumentOptions, 'source' | 'mimeType'> = {},
): Document => {
  return createTestDocument({
    ...options,
    source: 'upload_pdf',
    mimeType: 'application/pdf',
    originalFileName: options.originalFileName ?? 'document.pdf',
    originalFileSize: options.originalFileSize ?? 50000,
  });
};

/**
 * Reset the document counter (call in beforeEach for consistent test data).
 */
export const resetDocumentCounter = () => {
  documentCounter = 0;
};
