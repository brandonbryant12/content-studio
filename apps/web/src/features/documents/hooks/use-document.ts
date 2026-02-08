// features/documents/hooks/use-document.ts

import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Document = RouterOutput['documents']['get'];
type DocumentContent = RouterOutput['documents']['getContent'];

/**
 * Fetch a single document by ID with Suspense.
 * Use this when the document is required to render.
 */
export function useDocument(
  id: string,
): UseSuspenseQueryResult<Document, Error> {
  return useSuspenseQuery(
    apiClient.documents.get.queryOptions({ input: { id } }),
  );
}

/**
 * Fetch document text content by ID with Suspense.
 * Use this to display the parsed text of a document.
 */
export function useDocumentContent(
  id: string,
): UseSuspenseQueryResult<DocumentContent, Error> {
  return useSuspenseQuery(
    apiClient.documents.getContent.queryOptions({ input: { id } }),
  );
}
