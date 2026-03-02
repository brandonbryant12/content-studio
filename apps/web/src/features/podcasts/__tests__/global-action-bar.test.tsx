import { describe, expect, it, vi } from 'vitest';
import { GlobalActionBar } from '../components/workbench/global-action-bar';
import { VersionStatus } from '../lib/status';
import { render, screen, userEvent } from '@/test-utils';

describe('GlobalActionBar failed-state actions', () => {
  it('shows save-and-regenerate state for failed podcasts with unsaved changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onGenerate = vi.fn();

    render(
      <GlobalActionBar
        status={VersionStatus.FAILED}
        isGenerating={false}
        hasChanges
        isSaving={false}
        onSave={onSave}
        onGenerate={onGenerate}
      />,
    );

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Save & Regenerate' }),
    );

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('keeps direct retry when there are no unsaved changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onGenerate = vi.fn();

    render(
      <GlobalActionBar
        status={VersionStatus.FAILED}
        isGenerating={false}
        hasChanges={false}
        isSaving={false}
        onSave={onSave}
        onGenerate={onGenerate}
      />,
    );

    expect(screen.getByText('Generation failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
