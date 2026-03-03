import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WritingAssistantContainer } from '../components/workbench/writing-assistant-container';
import { useWritingAssistantChat } from '../hooks/use-writing-assistant-chat';
import { render, screen, userEvent } from '@/test-utils';

const { useWritingAssistantChatMock, sendUserMessageSpy, resetSpy } =
  vi.hoisted(() => ({
    useWritingAssistantChatMock: vi.fn(),
    sendUserMessageSpy: vi.fn(),
    resetSpy: vi.fn(),
  }));

vi.mock('../hooks/use-writing-assistant-chat', () => ({
  useWritingAssistantChat: useWritingAssistantChatMock,
}));

vi.mock('../components/workbench/writing-assistant-panel', () => ({
  WritingAssistantPanel: ({
    onSendMessage,
    onReset,
  }: {
    onSendMessage: (text: string) => void;
    onReset: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSendMessage('Rewrite intro')}>
        Send Message
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
      sendUserMessage: sendUserMessageSpy,
      isStreaming: false,
      error: undefined,
      reset: resetSpy,
      status: 'ready',
    } as never);
  });

  it('keeps send and reset behavior intact', async () => {
    const user = userEvent.setup();
    const onSetManuscriptText = vi.fn();
    const { rerender } = render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    expect(resetSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(sendUserMessageSpy).toHaveBeenCalledWith('Rewrite intro');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(resetSpy).toHaveBeenCalledTimes(2);

    rerender(
      <WritingAssistantContainer
        voiceoverId="voiceover-2"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    expect(useWritingAssistantChat).toHaveBeenCalledWith(
      'Current manuscript',
      onSetManuscriptText,
    );
    expect(resetSpy).toHaveBeenCalledTimes(3);
  });
});
