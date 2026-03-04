import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AddDocumentDialog } from '../add-document-dialog';
import { renderWithQuery, screen, userEvent, waitFor } from '@/test-utils';

const { mockUploadMutationFn, mockFromUrlMutationFn, mockUseDocuments } =
  vi.hoisted(() => ({
    mockUploadMutationFn: vi.fn(),
    mockFromUrlMutationFn: vi.fn(),
    mockUseDocuments: vi.fn(),
  }));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    sources: {
      upload: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: mockUploadMutationFn,
          ...options,
        }),
      },
      fromUrl: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: mockFromUrlMutationFn,
          ...options,
        }),
      },
    },
  },
}));

vi.mock('@/features/documents/hooks/use-document-list', () => ({
  useDocuments: mockUseDocuments,
  getDocumentListQueryKey: () => ['documents', 'list'],
}));

vi.mock('@/shared/components/base-dialog', () => ({
  BaseDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

describe('AddDocumentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocuments.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUploadMutationFn.mockResolvedValue({
      id: 'uploaded-doc-2',
      title: 'Uploaded',
      mimeType: 'text/plain',
      wordCount: 100,
    });
    mockFromUrlMutationFn.mockResolvedValue({
      id: 'url-doc-2',
      title: 'Dialog URL Document',
      mimeType: 'text/html',
      wordCount: 220,
    });
  });

  it('adds a document from URL and closes the dialog', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onAddDocuments = vi.fn();

    renderWithQuery(
      <AddDocumentDialog
        open={true}
        onOpenChange={onOpenChange}
        currentDocumentIds={[]}
        onAddDocuments={onAddDocuments}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'From URL' }));
    await user.type(screen.getByLabelText('URL'), 'https://example.com/news');
    await user.type(screen.getByLabelText(/Title/i), 'News Source');
    await user.click(screen.getByRole('button', { name: 'Add URL' }));

    await waitFor(() => expect(mockFromUrlMutationFn).toHaveBeenCalled());
    expect(mockFromUrlMutationFn.mock.calls[0]?.[0]).toEqual({
      url: 'https://example.com/news',
      title: 'News Source',
    });

    await waitFor(() =>
      expect(onAddDocuments).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'url-doc-2' }),
      ]),
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
