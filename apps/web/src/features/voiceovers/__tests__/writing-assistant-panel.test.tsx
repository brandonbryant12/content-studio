import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { WritingAssistantPanel } from '../components/workbench/writing-assistant-panel';
import { render, screen, userEvent } from '@/test-utils';

function assistantMessage(id: string, text: string): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text }],
  };
}

function proposal(overrides: Partial<{
  toolCallId: string;
  summary: string;
  revisedTranscript: string;
  decision: 'pending' | 'accepted' | 'rejected' | 'error';
  reason?: string;
}> = {}) {
  return {
    toolCallId: overrides.toolCallId ?? 'tool-1',
    summary: overrides.summary ?? 'Tightened the intro for a faster hook.',
    revisedTranscript:
      overrides.revisedTranscript ??
      'Welcome back. In 45 seconds, here is how your team ships AI safely.',
    decision: overrides.decision ?? 'pending',
    reason: overrides.reason,
  };
}

describe('WritingAssistantPanel', () => {
  it('lets users accept a pending transcript edit proposal', async () => {
    const user = userEvent.setup();
    const onAcceptProposal = vi.fn();
    const pendingProposal = proposal();

    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'I drafted a tighter version.')]}
        proposals={[pendingProposal]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAcceptProposal={onAcceptProposal}
        onRejectProposal={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Accept edit' }));

    expect(onAcceptProposal).toHaveBeenCalledWith(pendingProposal);
  });

  it('lets users reject a pending transcript edit proposal', async () => {
    const user = userEvent.setup();
    const onRejectProposal = vi.fn();
    const pendingProposal = proposal({ toolCallId: 'tool-2' });

    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'I have an alternative draft.')]}
        proposals={[pendingProposal]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAcceptProposal={vi.fn()}
        onRejectProposal={onRejectProposal}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reject edit' }));

    expect(onRejectProposal).toHaveBeenCalledWith(pendingProposal);
  });

  it('shows proposal status and hides action buttons once accepted', () => {
    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'Applied a cleaner cadence.')]}
        proposals={[proposal({ decision: 'accepted' })]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAcceptProposal={vi.fn()}
        onRejectProposal={vi.fn()}
      />,
    );

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Accept edit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject edit' }),
    ).not.toBeInTheDocument();
  });

  it('shows auto-reject guidance while proposals are pending', () => {
    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'Here is a focused rewrite.')]}
        proposals={[proposal({ toolCallId: 'tool-1' }), proposal({ toolCallId: 'tool-2' })]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAcceptProposal={vi.fn()}
        onRejectProposal={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/auto-reject pending proposals/i),
    ).toBeInTheDocument();
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('disables proposal actions while assistant is streaming', () => {
    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'Streaming draft text')]}
        proposals={[proposal()]}
        isStreaming={true}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAcceptProposal={vi.fn()}
        onRejectProposal={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Accept edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject edit' })).toBeDisabled();
  });
});
