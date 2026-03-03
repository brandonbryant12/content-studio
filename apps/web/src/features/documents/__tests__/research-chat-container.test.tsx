import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResearchChatContainer } from '../components/research-chat-container';
import { render, screen, userEvent, waitFor } from '@/test-utils';

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
    onSynthesize,
    onConfirmResearch,
    onDismissPreview,
    preview,
    autoGeneratePodcast,
    onAutoGeneratePodcastChange,
    autoGenerateVoiceover,
    onAutoGenerateVoiceoverChange,
    autoGenerateInfographic,
    onAutoGenerateInfographicChange,
  }: {
    onSynthesize: () => void;
    onConfirmResearch: () => void;
    onDismissPreview: () => void;
    preview: { query: string; title: string } | null;
    autoGeneratePodcast: boolean;
    onAutoGeneratePodcastChange: (value: boolean) => void;
    autoGenerateVoiceover: boolean;
    onAutoGenerateVoiceoverChange: (value: boolean) => void;
    autoGenerateInfographic: boolean;
    onAutoGenerateInfographicChange: (value: boolean) => void;
  }) => (
    <div>
      <button onClick={() => onAutoGeneratePodcastChange(!autoGeneratePodcast)}>
        Toggle Auto Podcast
      </button>
      <button
        onClick={() => onAutoGenerateVoiceoverChange(!autoGenerateVoiceover)}
      >
        Toggle Auto Voiceover
      </button>
      <button
        onClick={() =>
          onAutoGenerateInfographicChange(!autoGenerateInfographic)
        }
      >
        Toggle Auto Infographic
      </button>
      <button onClick={onSynthesize}>Synthesize</button>
      {preview && (
        <div>
          <p>Preview: {preview.title}</p>
          <button onClick={onConfirmResearch}>Confirm Research</button>
          <button onClick={onDismissPreview}>Dismiss Preview</button>
        </div>
      )}
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

  it('synthesize shows preview, confirm starts research', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ResearchChatContainer open={true} onOpenChange={onOpenChange} />);

    // Step 1: synthesize
    await user.click(screen.getByRole('button', { name: 'Synthesize' }));

    // Step 2: preview appears
    await waitFor(() =>
      expect(
        screen.getByText('Preview: AI Market Analysis'),
      ).toBeInTheDocument(),
    );

    // Step 3: confirm research
    await user.click(screen.getByRole('button', { name: 'Confirm Research' }));

    expect(startResearchMutate).toHaveBeenCalled();
    expect(startResearchMutate.mock.calls[0]?.[0]).toEqual({
      query: 'AI market analysis',
      title: 'AI Market Analysis',
      autoGeneratePodcast: false,
      autoGenerateVoiceover: false,
      autoGenerateInfographic: false,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('passes auto-generate podcast flag through to start research', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ResearchChatContainer open={true} onOpenChange={onOpenChange} />);

    // Toggle checkbox first
    await user.click(
      screen.getByRole('button', { name: 'Toggle Auto Podcast' }),
    );

    // Synthesize
    await user.click(screen.getByRole('button', { name: 'Synthesize' }));

    await waitFor(() =>
      expect(
        screen.getByText('Preview: AI Market Analysis'),
      ).toBeInTheDocument(),
    );

    // Confirm
    await user.click(screen.getByRole('button', { name: 'Confirm Research' }));

    expect(startResearchMutate.mock.calls[0]?.[0]).toEqual({
      query: 'AI market analysis',
      title: 'AI Market Analysis',
      autoGeneratePodcast: true,
      autoGenerateVoiceover: false,
      autoGenerateInfographic: false,
    });
  });

  it('passes auto-generate voiceover and infographic flags through to start research', async () => {
    const user = userEvent.setup();

    render(<ResearchChatContainer open={true} onOpenChange={vi.fn()} />);

    await user.click(
      screen.getByRole('button', { name: 'Toggle Auto Voiceover' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Toggle Auto Infographic' }),
    );

    await user.click(screen.getByRole('button', { name: 'Synthesize' }));
    await waitFor(() =>
      expect(
        screen.getByText('Preview: AI Market Analysis'),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Confirm Research' }));

    expect(startResearchMutate.mock.calls[0]?.[0]).toEqual({
      query: 'AI market analysis',
      title: 'AI Market Analysis',
      autoGeneratePodcast: false,
      autoGenerateVoiceover: true,
      autoGenerateInfographic: true,
    });
  });

  it('dismiss preview clears preview and extends follow-ups', async () => {
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
      shouldAutoStart: false,
      followUpCount: 1,
      followUpLimit: 2,
      extendFollowUps,
      reset: vi.fn(),
    });

    render(<ResearchChatContainer open={true} onOpenChange={vi.fn()} />);

    // Synthesize to get preview
    await user.click(screen.getByRole('button', { name: 'Synthesize' }));
    await waitFor(() =>
      expect(
        screen.getByText('Preview: AI Market Analysis'),
      ).toBeInTheDocument(),
    );

    // Dismiss preview
    await user.click(screen.getByRole('button', { name: 'Dismiss Preview' }));

    expect(extendFollowUps).toHaveBeenCalled();
    expect(
      screen.queryByText('Preview: AI Market Analysis'),
    ).not.toBeInTheDocument();
  });
});
