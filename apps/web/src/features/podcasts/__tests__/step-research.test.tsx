import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepResearch } from '../components/setup/steps/step-research';
import { renderWithQuery, screen, userEvent, waitFor } from '@/test-utils';

const {
  mockFromResearchMutationFn,
  mockUseResearchChat,
  mockUseSynthesizeResearch,
  synthesizeMutate,
} = vi.hoisted(() => ({
  mockFromResearchMutationFn: vi.fn(),
  mockUseResearchChat: vi.fn(),
  mockUseSynthesizeResearch: vi.fn(),
  synthesizeMutate: vi.fn(),
}));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    sources: {
      fromResearch: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: mockFromResearchMutationFn,
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
  isDeepResearchEnabled: true,
}));

vi.mock('@/features/sources/hooks', () => ({
  getSourceListQueryKey: () => ['sources', 'list'],
  useResearchChat: mockUseResearchChat,
  useSynthesizeResearch: mockUseSynthesizeResearch,
}));

describe('StepResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseResearchChat.mockReturnValue({
      messages: [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'x' }] },
      ],
      sendMessage: vi.fn(),
      isStreaming: false,
      error: undefined,
      canStartResearch: true,
      shouldAutoStart: false,
      followUpCount: 1,
      followUpLimit: 2,
      extendFollowUps: vi.fn(),
    });

    synthesizeMutate.mockImplementation(
      (
        _messages: unknown,
        options?: {
          onSuccess?: (data: { query: string; title: string }) => void;
        },
      ) => {
        options?.onSuccess?.({
          query: 'AI market analysis',
          title: 'AI Market Analysis',
        });
      },
    );

    mockUseSynthesizeResearch.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: false,
      error: undefined,
    });

    mockFromResearchMutationFn.mockResolvedValue({
      id: 'doc-123',
      title: 'AI Market Analysis',
    });
  });

  it('starts research from one click', async () => {
    const user = userEvent.setup();
    const onSourceCreated = vi.fn();

    renderWithQuery(
      <StepResearch onSourceCreated={onSourceCreated} createdSourceId={null} />,
    );

    await user.click(screen.getByRole('button', { name: 'Start Research' }));

    expect(synthesizeMutate).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockFromResearchMutationFn).toHaveBeenCalledWith(
        {
          query: 'AI market analysis',
          title: 'AI Market Analysis',
        },
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(onSourceCreated).toHaveBeenCalledWith(
        'doc-123',
        'AI Market Analysis',
      ),
    );
  });

  it('uses auto-trigger confirmation controls when ready', async () => {
    const user = userEvent.setup();
    const extendFollowUps = vi.fn();

    mockUseResearchChat.mockReturnValue({
      messages: [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'x' }] },
      ],
      sendMessage: vi.fn(),
      isStreaming: false,
      error: undefined,
      canStartResearch: true,
      shouldAutoStart: true,
      followUpCount: 2,
      followUpLimit: 2,
      extendFollowUps,
    });

    renderWithQuery(
      <StepResearch onSourceCreated={vi.fn()} createdSourceId={null} />,
    );

    await user.click(screen.getByRole('button', { name: 'Keep Refining' }));
    expect(extendFollowUps).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Start Research' }));
    expect(synthesizeMutate).toHaveBeenCalled();
  });

  it('prevents duplicate starts while pending', async () => {
    const user = userEvent.setup();

    mockUseSynthesizeResearch.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: true,
      error: undefined,
    });

    renderWithQuery(
      <StepResearch onSourceCreated={vi.fn()} createdSourceId={null} />,
    );

    const button = screen.getByRole('button', { name: /Preparing research/ });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(synthesizeMutate).not.toHaveBeenCalled();
    expect(mockFromResearchMutationFn).not.toHaveBeenCalled();
  });
});
