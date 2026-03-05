import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepSources } from '../components/setup/steps/step-sources';
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

vi.mock('../components/setup/steps/step-research', () => ({
  StepResearch: () => <div data-testid="step-research" />,
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
      <StepSources
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        researchDocId={null}
        onSourceCreated={vi.fn()}
      />,
    );

    expect(screen.getByText('Add Sources')).toBeInTheDocument();
    expect(screen.getByText('Why sources matter')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Each selected source becomes part of the factual context/i,
      ),
    ).toBeInTheDocument();

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
});
