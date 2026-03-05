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

describe('WritingAssistantPanel', () => {
  it('sends typed messages to the caller', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'I can rewrite this intro.')]}
        isStreaming={false}
        error={undefined}
        onSendMessage={onSendMessage}
        onReset={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Writing assistant input' }),
      'Rewrite this with a stronger opening.',
    );
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSendMessage).toHaveBeenCalledWith(
      'Rewrite this with a stronger opening.',
    );
  });

  it('shows clear button when messages exist and calls onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'Draft ready.')]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={onReset}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onReset).toHaveBeenCalled();
  });

  it('shows direct-apply guidance copy', () => {
    render(
      <WritingAssistantPanel
        messages={[]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Use AI to improve the current script before you generate audio\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/uses your current script as context/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/rewrites are applied directly to the editor/i),
    ).toBeInTheDocument();
  });
});
