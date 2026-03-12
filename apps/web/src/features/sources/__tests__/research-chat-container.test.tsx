import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResearchChatContainer } from '../components/research-chat-container';
import { render, screen, userEvent } from '@/test-utils';

const {
  mockUseResearchChat,
  mockUseSynthesizeResearch,
  mockUseStartResearch,
  synthesizeMutate,
  startResearchMutate,
} = vi.hoisted(() => ({
  mockUseResearchChat: vi.fn(),
  mockUseSynthesizeResearch: vi.fn(),
  mockUseStartResearch: vi.fn(),
  synthesizeMutate: vi.fn(),
  startResearchMutate: vi.fn(),
}));

vi.mock('../hooks/use-research-chat', () => ({
  useResearchChat: mockUseResearchChat,
}));

vi.mock('../hooks/use-synthesize-research', () => ({
  useSynthesizeResearch: mockUseSynthesizeResearch,
}));

vi.mock('../hooks/use-start-research', () => ({
  useStartResearch: mockUseStartResearch,
}));

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
  isDeepResearchEnabled: true,
}));

vi.mock('../components/research-chat-dialog', () => ({
  ResearchChatDialog: ({
    onStartResearch,
    autoGeneratePodcast,
    onAutoGeneratePodcastChange,
  }: {
    onStartResearch: () => void;
    autoGeneratePodcast: boolean;
    onAutoGeneratePodcastChange: (value: boolean) => void;
  }) => (
    <div>
      <button onClick={() => onAutoGeneratePodcastChange(!autoGeneratePodcast)}>
        Toggle Auto Podcast
      </button>
      <button onClick={onStartResearch}>Start Research</button>
    </div>
  ),
}));

describe('ResearchChatContainer', () => {
  const renderContainer = ({
    onOpenChange = vi.fn(),
    defaultAutoGeneratePodcast,
  }: {
    onOpenChange?: (open: boolean) => void;
    defaultAutoGeneratePodcast?: boolean;
  } = {}) => {
    render(
      <ResearchChatContainer
        open={true}
        onOpenChange={onOpenChange}
        defaultAutoGeneratePodcast={defaultAutoGeneratePodcast}
      />,
    );
    return { onOpenChange, user: userEvent.setup() };
  };

  const getStartPayload = () => startResearchMutate.mock.calls[0]?.[0];

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
      reset: vi.fn(),
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

    startResearchMutate.mockImplementation(
      (_input: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    mockUseSynthesizeResearch.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: false,
      error: undefined,
    });

    mockUseStartResearch.mockReturnValue({
      mutate: startResearchMutate,
      isPending: false,
      error: undefined,
    });
  });

  it.each([
    {
      defaultAutoGeneratePodcast: false,
      autoGeneratePodcast: false,
      toggleBeforeStart: false,
    },
    {
      defaultAutoGeneratePodcast: false,
      autoGeneratePodcast: true,
      toggleBeforeStart: true,
    },
    {
      defaultAutoGeneratePodcast: true,
      autoGeneratePodcast: true,
      toggleBeforeStart: false,
    },
    {
      defaultAutoGeneratePodcast: true,
      autoGeneratePodcast: false,
      toggleBeforeStart: true,
    },
  ])(
    'starts research with autoGeneratePodcast=$autoGeneratePodcast',
    async ({
      defaultAutoGeneratePodcast,
      autoGeneratePodcast,
      toggleBeforeStart,
    }) => {
      const { user, onOpenChange } = renderContainer({
        onOpenChange: vi.fn(),
        defaultAutoGeneratePodcast,
      });

      if (toggleBeforeStart) {
        await user.click(
          screen.getByRole('button', { name: 'Toggle Auto Podcast' }),
        );
      }

      await user.click(screen.getByRole('button', { name: 'Start Research' }));

      expect(synthesizeMutate).toHaveBeenCalled();
      expect(startResearchMutate).toHaveBeenCalled();
      expect(getStartPayload()).toEqual({
        query: 'AI market analysis',
        title: 'AI Market Analysis',
        autoGeneratePodcast,
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    },
  );

  it('does not trigger while synthesize is already pending', async () => {
    mockUseSynthesizeResearch.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: true,
      error: undefined,
    });

    const { user } = renderContainer();

    await user.click(screen.getByRole('button', { name: 'Start Research' }));

    expect(synthesizeMutate).not.toHaveBeenCalled();
    expect(startResearchMutate).not.toHaveBeenCalled();
  });
});
