import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { WritingAssistantPanel } from '../components/workbench/writing-assistant-panel';
import { render, screen, userEvent, within } from '@/test-utils';

function assistantMessage(id: string, text: string): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text }],
  };
}

describe('WritingAssistantPanel', () => {
  it('appends the latest assistant response to manuscript', async () => {
    const user = userEvent.setup();
    const onAppendToManuscript = vi.fn();

    render(
      <WritingAssistantPanel
        messages={[
          assistantMessage('a-1', 'First option'),
          assistantMessage('a-2', 'Latest rewrite suggestion'),
        ]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAppendToManuscript={onAppendToManuscript}
        onReplaceManuscript={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Append to Manuscript' }),
    );

    expect(onAppendToManuscript).toHaveBeenCalledWith(
      'Latest rewrite suggestion',
    );
  });

  it('requires confirmation before replacing manuscript text', async () => {
    const user = userEvent.setup();
    const onReplaceManuscript = vi.fn();

    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'Final draft text')]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAppendToManuscript={vi.fn()}
        onReplaceManuscript={onReplaceManuscript}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Replace Manuscript' }));
    expect(onReplaceManuscript).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Replace manuscript' }),
    );

    expect(onReplaceManuscript).toHaveBeenCalledWith('Final draft text');
  });

  it('hides manuscript apply actions when there is no assistant response', () => {
    render(
      <WritingAssistantPanel
        messages={[]}
        isStreaming={false}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAppendToManuscript={vi.fn()}
        onReplaceManuscript={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Append to Manuscript' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Replace Manuscript' }),
    ).not.toBeInTheDocument();
  });

  it('disables manuscript apply actions while assistant is streaming', () => {
    render(
      <WritingAssistantPanel
        messages={[assistantMessage('a-1', 'Streaming draft text')]}
        isStreaming={true}
        error={undefined}
        onSendMessage={vi.fn()}
        onReset={vi.fn()}
        onAppendToManuscript={vi.fn()}
        onReplaceManuscript={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Append to Manuscript' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Replace Manuscript' }),
    ).toBeDisabled();
  });
});
