import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WritingAssistantContainer } from '../components/workbench/writing-assistant-container';
import { useWritingAssistantChat } from '@/shared/hooks/use-writing-assistant-chat';
import { render, screen, userEvent } from '@/test-utils';

const { useWritingAssistantChatMock, sendUserMessageSpy, resetSpy } =
  vi.hoisted(() => ({
    useWritingAssistantChatMock: vi.fn(),
    sendUserMessageSpy: vi.fn(),
    resetSpy: vi.fn(),
  }));

vi.mock('@/shared/hooks/use-writing-assistant-chat', () => ({
  useWritingAssistantChat: useWritingAssistantChatMock,
}));

vi.mock('@/shared/components/writing-assistant-panel', () => ({
  WritingAssistantPanel: ({
    onSendMessage,
    onReset,
  }: {
    onSendMessage: (text: string) => void;
    onReset: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSendMessage('Rewrite the intro')}>
        Send Message
      </button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));

describe('Podcast WritingAssistantContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWritingAssistantChat).mockReturnValue({
      messages: [],
      sendUserMessage: sendUserMessageSpy,
      isStreaming: false,
      error: undefined,
      reset: resetSpy,
      status: 'ready',
    } as never);
  });

  it('formats podcast segments and applies structured rewrites back into local segments', () => {
    const onReplaceSegments = vi.fn();

    render(
      <WritingAssistantContainer
        podcastId="podcast-1"
        format="conversation"
        segments={[
          { speaker: 'Alex', line: 'Open the show.', index: 0 },
          { speaker: 'Blair', line: 'React to the open.', index: 1 },
        ]}
        onReplaceSegments={onReplaceSegments}
      />,
    );

    expect(useWritingAssistantChat).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: 'podcast',
        draft: '[Alex]\nOpen the show.\n\n[Blair]\nReact to the open.',
        speakerNames: ['Alex', 'Blair'],
        confirmationMessage: expect.stringContaining('Save & Regenerate'),
      }),
    );

    const options = vi.mocked(useWritingAssistantChat).mock.calls[0]?.[0] as {
      onApplySegmentsEdit: (
        segments: Array<{ speaker: string; line: string; index: number }>,
      ) => void;
      getDraftFromSegments: (
        segments: Array<{ speaker: string; line: string; index: number }>,
      ) => string;
    };

    const assistantSegments = [
      {
        speaker: 'Analyst',
        line: 'Key statistic: Revenue rose 20%.',
        index: 7,
      },
    ];

    options.onApplySegmentsEdit(assistantSegments);

    expect(onReplaceSegments).toHaveBeenCalledWith(assistantSegments);
    expect(options.getDraftFromSegments(assistantSegments)).toBe(
      '[Analyst]\nKey statistic: Revenue rose 20%.',
    );
  });

  it('keeps send and reset behavior intact across podcast changes', async () => {
    const user = userEvent.setup();
    const onReplaceSegments = vi.fn();
    const { rerender } = render(
      <WritingAssistantContainer
        podcastId="podcast-1"
        format="voice_over"
        segments={[{ speaker: 'Narrator', line: 'Line one.', index: 0 }]}
        onReplaceSegments={onReplaceSegments}
      />,
    );

    expect(resetSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(sendUserMessageSpy).toHaveBeenCalledWith('Rewrite the intro');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(resetSpy).toHaveBeenCalledTimes(2);

    rerender(
      <WritingAssistantContainer
        podcastId="podcast-2"
        format="voice_over"
        segments={[{ speaker: 'Narrator', line: 'Line one.', index: 0 }]}
        onReplaceSegments={onReplaceSegments}
      />,
    );

    expect(useWritingAssistantChat).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: 'podcast',
        speakerNames: ['Narrator'],
      }),
    );
    expect(resetSpy).toHaveBeenCalledTimes(3);
  });
});
