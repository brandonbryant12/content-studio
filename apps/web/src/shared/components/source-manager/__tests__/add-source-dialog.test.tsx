import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AddSourceDialog } from '../add-source-dialog';
import { renderWithQuery, screen, userEvent, waitFor } from '@/test-utils';

const { mockUploadMutationFn, mockFromUrlMutationFn, mockUseSources } =
  vi.hoisted(() => ({
    mockUploadMutationFn: vi.fn(),
    mockFromUrlMutationFn: vi.fn(),
    mockUseSources: vi.fn(),
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

vi.mock('@/features/sources/hooks/use-source-list', () => ({
  useSources: mockUseSources,
  getSourceListQueryKey: () => ['sources', 'list'],
}));

vi.mock('@/shared/components/base-dialog', () => ({
  BaseDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

describe('AddSourceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSources.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUploadMutationFn.mockResolvedValue({
      id: 'uploaded-src-2',
      title: 'Uploaded',
      mimeType: 'text/plain',
      wordCount: 100,
    });
    mockFromUrlMutationFn.mockResolvedValue({
      id: 'url-src-2',
      title: 'URL Source',
      mimeType: 'text/html',
      wordCount: 220,
    });
  });

  it('adds a source from URL and closes the dialog', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onAddSources = vi.fn();

    renderWithQuery(
      <AddSourceDialog
        open={true}
        onOpenChange={onOpenChange}
        currentSourceIds={[]}
        onAddSources={onAddSources}
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
      expect(onAddSources).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'url-src-2' }),
      ]),
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
