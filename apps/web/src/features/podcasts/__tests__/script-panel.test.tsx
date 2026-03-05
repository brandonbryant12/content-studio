import { describe, it, expect, vi } from 'vitest';
import { ScriptPanel } from '../components/workbench/script-panel';
import { render, screen, userEvent, within } from '@/test-utils';

const baseSegment = {
  index: 0,
  speaker: 'host',
  line: 'First line',
} as const;

describe('ScriptPanel discard confirmation', () => {
  it('asks for confirmation before discarding and only discards on confirm', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();

    render(
      <ScriptPanel
        segments={[baseSegment]}
        summary={null}
        hasChanges
        isSaving={false}
        onUpdateSegment={vi.fn()}
        onRemoveSegment={vi.fn()}
        onAddSegment={vi.fn()}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByText('How podcast scripts work')).toBeInTheDocument();
    expect(
      screen.getByText(
        /This script starts as an AI-generated draft from your selected sources and settings\./,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(
      screen.getByRole('heading', { name: 'Discard unsaved changes?' }),
    ).toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDiscard).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Discard',
      }),
    );
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
