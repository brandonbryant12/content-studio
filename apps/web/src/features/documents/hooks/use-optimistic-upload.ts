// features/documents/hooks/use-optimistic-upload.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getDocumentListQueryKey } from './use-document-list';

/**
 * Upload document mutation with query invalidation.
 * Uses standard mutation (not optimistic) since the document is server-processed.
 */
export function useOptimisticUpload(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.documents.upload.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDocumentListQueryKey() });
        toast.success('Document uploaded successfully');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload document'));
      },
    }),
  );
}

/**
 * Convert file to base64 for upload.
 */
export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      '',
    ),
  );
}
