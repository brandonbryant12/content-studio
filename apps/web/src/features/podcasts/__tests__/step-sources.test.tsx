import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepSources } from '../components/setup/steps/step-sources';
import {
  renderWithQuery,
  screen,
  userEvent,
  waitFor,
} from '@/test-utils';

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

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
}));

vi.mock('@/features/sources/hooks/use-source-list', () => ({
  useSources: mockUseSources,
  getSourceListQueryKey: () => ['sources', 'list'],
}));

describe('StepSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSources.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUploadMutationFn.mockResolvedValue({
      id: 'uploaded-doc-1',
      title: 'Uploaded Document',
      mimeType: 'text/plain',
      wordCount: 120,
    });
    mockFromUrlMutationFn.mockResolvedValue({
      id: 'url-doc-1',
      title: 'URL Document',
      mimeType: 'text/html',
      wordCount: 320,
    });
  });

  it('creates a source from URL and auto-selects it', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    renderWithQuery(
      <StepSources selectedIds={[]} onSelectionChange={onSelectionChange} />,
    );

    await user.click(screen.getByRole('tab', { name: 'From URL' }));
    await user.type(
      screen.getByLabelText('URL'),
      'https://example.com/podcast-source',
    );
    await user.type(screen.getByLabelText(/Title/i), 'Podcast Source');
    await user.click(screen.getByRole('button', { name: 'Add URL' }));

    await waitFor(() => expect(mockFromUrlMutationFn).toHaveBeenCalled());
    expect(mockFromUrlMutationFn.mock.calls[0]?.[0]).toEqual({
      url: 'https://example.com/podcast-source',
      title: 'Podcast Source',
    });

    await waitFor(() =>
      expect(onSelectionChange).toHaveBeenCalledWith(['url-doc-1']),
    );
  });

  it('shows the three source tabs', () => {
    renderWithQuery(
      <StepSources selectedIds={[]} onSelectionChange={vi.fn()} />,
    );

    expect(
      screen.getByRole('tab', { name: 'Select Existing' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Upload New' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'From URL' })).toBeInTheDocument();
  });
});
