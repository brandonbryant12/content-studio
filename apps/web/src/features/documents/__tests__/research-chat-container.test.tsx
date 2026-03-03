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

  it('starts research from one click', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ResearchChatContainer open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Start Research' }));

    expect(synthesizeMutate).toHaveBeenCalled();
    expect(startResearchMutate).toHaveBeenCalled();
    expect(startResearchMutate.mock.calls[0]?.[0]).toEqual({
      query: 'AI market analysis',
      title: 'AI Market Analysis',
      autoGeneratePodcast: false,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('passes auto-generate podcast flag through to start research', async () => {
    const user = userEvent.setup();

    render(<ResearchChatContainer open={true} onOpenChange={vi.fn()} />);

    // Toggle checkbox first
    await user.click(
      screen.getByRole('button', { name: 'Toggle Auto Podcast' }),
    );

    await user.click(screen.getByRole('button', { name: 'Start Research' }));

    expect(startResearchMutate.mock.calls[0]?.[0]).toEqual({
      query: 'AI market analysis',
      title: 'AI Market Analysis',
      autoGeneratePodcast: true,
    });
  });

  it('does not trigger while synthesize is already pending', async () => {
    const user = userEvent.setup();

    mockUseSynthesizeResearch.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: true,
      error: undefined,
    });

    render(<ResearchChatContainer open={true} onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Start Research' }));

    expect(synthesizeMutate).not.toHaveBeenCalled();
    expect(startResearchMutate).not.toHaveBeenCalled();
  });
});
