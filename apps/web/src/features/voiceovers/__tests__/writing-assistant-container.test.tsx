import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WritingAssistantContainer } from '../components/workbench/writing-assistant-container';
import { useWritingAssistantChat } from '../hooks/use-writing-assistant-chat';
import { render, screen, userEvent } from '@/test-utils';

const {
  useWritingAssistantChatMock,
  sendUserMessageSpy,
  acceptProposalSpy,
  rejectProposalSpy,
  resetSpy,
} = vi.hoisted(
  () => ({
    useWritingAssistantChatMock: vi.fn(),
    sendUserMessageSpy: vi.fn(),
    acceptProposalSpy: vi.fn(),
    rejectProposalSpy: vi.fn(),
    resetSpy: vi.fn(),
  }),
);

vi.mock('../hooks/use-writing-assistant-chat', () => ({
  useWritingAssistantChat: useWritingAssistantChatMock,
}));

vi.mock('../components/workbench/writing-assistant-panel', () => ({
  WritingAssistantPanel: ({
    proposals,
    onSendMessage,
    onAcceptProposal,
    onRejectProposal,
    onReset,
  }: {
    proposals: Array<{ toolCallId: string; revisedTranscript: string }>;
    onSendMessage: (text: string) => void;
    onAcceptProposal: (proposal: {
      toolCallId: string;
      revisedTranscript: string;
    }) => void;
    onRejectProposal: (proposal: {
      toolCallId: string;
      revisedTranscript: string;
    }) => void;
    onReset: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSendMessage('Rewrite intro')}>
        Send Message
      </button>
      <button type="button" onClick={() => onAcceptProposal(proposals[0]!)}>
        Accept
      </button>
      <button type="button" onClick={() => onRejectProposal(proposals[0]!)}>
        Reject
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
      proposals: [
        {
          toolCallId: 'tool-1',
          summary: 'Improved pacing in the intro.',
          revisedTranscript: 'Updated transcript text',
          decision: 'pending',
        },
      ],
      acceptProposal: acceptProposalSpy,
      rejectProposal: rejectProposalSpy,
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
    expect(sendUserMessageSpy).toHaveBeenCalledWith('Rewrite intro');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(resetSpy).toHaveBeenCalledTimes(2);

    rerender(
      <WritingAssistantContainer
        voiceoverId="voiceover-2"
        manuscriptText="Current manuscript"
        onSetManuscriptText={vi.fn()}
      />,
    );

    expect(useWritingAssistantChat).toHaveBeenCalledWith('Current manuscript');
    expect(resetSpy).toHaveBeenCalledTimes(3);
  });

  it('applies accepted proposal text to manuscript and records tool result', async () => {
    const user = userEvent.setup();
    const onSetManuscriptText = vi.fn();

    render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(onSetManuscriptText).toHaveBeenCalledWith('Updated transcript text');
    expect(acceptProposalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCallId: 'tool-1',
      }),
    );
  });

  it('forwards rejection decisions without mutating manuscript text', async () => {
    const user = userEvent.setup();
    const onSetManuscriptText = vi.fn();

    render(
      <WritingAssistantContainer
        voiceoverId="voiceover-1"
        manuscriptText="Current manuscript"
        onSetManuscriptText={onSetManuscriptText}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onSetManuscriptText).not.toHaveBeenCalled();
    expect(rejectProposalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCallId: 'tool-1',
      }),
    );
  });
});
