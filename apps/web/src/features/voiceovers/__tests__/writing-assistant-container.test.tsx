import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WritingAssistantContainer } from '../components/workbench/writing-assistant-container';
import { useWritingAssistantChat } from '../hooks/use-writing-assistant-chat';
import { render, screen, userEvent } from '@/test-utils';

const { useWritingAssistantChatMock, sendMessageSpy, resetSpy } = vi.hoisted(
  () => ({
    useWritingAssistantChatMock: vi.fn(),
    sendMessageSpy: vi.fn(),
    resetSpy: vi.fn(),
  }),
);

vi.mock('../hooks/use-writing-assistant-chat', () => ({
  useWritingAssistantChat: useWritingAssistantChatMock,
}));

vi.mock('../components/workbench/writing-assistant-panel', () => ({
  WritingAssistantPanel: ({
    onSendMessage,
    onAppendToManuscript,
    onReplaceManuscript,
    onReset,
  }: {
    onSendMessage: (text: string) => void;
    onAppendToManuscript: (text: string) => void;
    onReplaceManuscript: (text: string) => void;
    onReset: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSendMessage('Rewrite intro')}>
        Send Message
      </button>
      <button
        type="button"
        onClick={() => onAppendToManuscript('Suggested continuation')}
      >
        Append
      </button>
      <button type="button" onClick={() => onAppendToManuscript('   ')}>
        Append Empty
      </button>
      <button
        type="button"
        onClick={() => onReplaceManuscript('  Full replacement text  ')}
      >
        Replace
      </button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));

describe('WritingAssistantContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWritingAssistantChat).mockReturnValue({
      messages: [],
      sendMessage: sendMessageSpy,
      isStreaming: false,
      error: undefined,
      reset: resetSpy,
      status: 'ready',
    } as never);
  });

  it('keeps send and reset behavior intact', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={vi.fn()}
      />,
    );

    expect(resetSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(sendMessageSpy).toHaveBeenCalledWith({ text: 'Rewrite intro' });

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(resetSpy).toHaveBeenCalledTimes(2);

    rerender(
      <WritingAssistantContainer
        voiceoverId="voiceover-2"
        manuscriptText="Current manuscript"
        onSetManuscriptText={vi.fn()}
      />,
    );

    expect(resetSpy).toHaveBeenCalledTimes(3);
  });

  it('appends latest assistant text to manuscript', async () => {
    const user = userEvent.setup();
    const onSetManuscriptText = vi.fn();

    render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Append' }));

    expect(onSetManuscriptText).toHaveBeenCalledWith(
      'Current manuscript\n\nSuggested continuation',
    );
  });

  it('does not append empty assistant output', async () => {
    const user = userEvent.setup();
    const onSetManuscriptText = vi.fn();

    render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Append Empty' }));

    expect(onSetManuscriptText).not.toHaveBeenCalled();
  });

  it('replaces manuscript text with trimmed assistant output', async () => {
    const user = userEvent.setup();
    const onSetManuscriptText = vi.fn();

    render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Replace' }));

    expect(onSetManuscriptText).toHaveBeenCalledWith('Full replacement text');
  });
});
