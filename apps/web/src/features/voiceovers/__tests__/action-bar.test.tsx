import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ActionBar } from '../components/workbench/action-bar';
import { VoiceoverStatus } from '../lib/status';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@repo/ui/components/spinner', () => ({
  Spinner: ({ className }: { className?: string }) => (
    <span data-testid="spinner" className={className}>
      Loading...
    </span>
  ),
}));

vi.mock('@radix-ui/react-icons', () => ({
  CheckIcon: () => <span data-testid="check-icon" />,
  ExclamationTriangleIcon: () => <span data-testid="error-icon" />,
  LightningBoltIcon: () => <span data-testid="lightning-bolt-icon" />,
  ReloadIcon: () => <span data-testid="reload-icon" />,
}));

vi.mock('@repo/ui/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

interface ActionBarProps {
  status: (typeof VoiceoverStatus)[keyof typeof VoiceoverStatus] | undefined;
  errorMessage?: string | null;
  isGenerating: boolean;
  hasChanges: boolean;
  hasText: boolean;
  isSaving: boolean;
  onSave: () => void;
  onGenerate: () => void;
  disabled?: boolean;
}

const createDefaultProps = (
  overrides: Partial<ActionBarProps> = {},
): ActionBarProps => ({
  status: VoiceoverStatus.DRAFTING,
  isGenerating: false,
  hasChanges: false,
  hasText: true,
  isSaving: false,
  onSave: vi.fn(),
  onGenerate: vi.fn(),
  ...overrides,
});

const renderActionBar = (overrides: Partial<ActionBarProps> = {}) => {
  render(<ActionBar {...createDefaultProps(overrides)} />);
  return { user: userEvent.setup() };
};

describe('ActionBar', () => {
  it('shows active generation state and suppresses stale failure details', () => {
    renderActionBar({
      isGenerating: true,
      status: VoiceoverStatus.FAILED,
      errorMessage: 'Previous attempt failed',
    });

    expect(screen.getByRole('status')).toHaveTextContent(/generating/i);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows save and regenerate actions for unsaved text and invokes callbacks', async () => {
    const onSave = vi.fn();
    const onGenerate = vi.fn();
    const { user } = renderActionBar({
      hasChanges: true,
      hasText: true,
      status: VoiceoverStatus.READY,
      onSave,
      onGenerate,
    });

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save draft/i }));
    await user.click(
      screen.getByRole('button', { name: /save & regenerate/i }),
    );

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows only save action for unsaved empty text', () => {
    renderActionBar({
      hasChanges: true,
      hasText: false,
      status: VoiceoverStatus.DRAFTING,
    });

    expect(screen.getByRole('button', { name: /save draft/i })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /save & regenerate/i }),
    ).not.toBeInTheDocument();
  });

  it('renders saving state as disabled actions with loading indicators', () => {
    renderActionBar({
      hasChanges: true,
      hasText: true,
      status: VoiceoverStatus.READY,
      isSaving: true,
    });

    const savingButtons = screen.getAllByRole('button', { name: /saving/i });
    expect(savingButtons).toHaveLength(2);
    expect(
      savingButtons.every((button) => button.hasAttribute('disabled')),
    ).toBe(true);
    expect(screen.getAllByTestId('spinner')).toHaveLength(2);
  });

  it.each([
    { disabled: false, expectedCalls: 1 },
    { disabled: true, expectedCalls: 0 },
  ])(
    'handles drafting generation clicks when disabled=$disabled',
    async ({ disabled, expectedCalls }) => {
      const onGenerate = vi.fn();
      const { user } = renderActionBar({
        hasChanges: false,
        hasText: true,
        status: VoiceoverStatus.DRAFTING,
        disabled,
        onGenerate,
      });

      const button = screen.getByRole('button', { name: /generate audio/i });
      if (disabled) {
        expect(button).toBeDisabled();
      }
      await user.click(button);
      expect(onGenerate).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it('renders draft status without actions when no text exists', () => {
    renderActionBar({
      hasChanges: false,
      hasText: false,
      status: VoiceoverStatus.DRAFTING,
    });

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /generate audio/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument();
  });

  it('renders ready status with success icon and no actions', () => {
    renderActionBar({
      hasChanges: false,
      status: VoiceoverStatus.READY,
    });

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders failed status with retry action and sanitized failure details', async () => {
    const onGenerate = vi.fn();
    const { user } = renderActionBar({
      hasChanges: false,
      status: VoiceoverStatus.FAILED,
      errorMessage: 'TTS provider timeout',
      onGenerate,
    });

    expect(screen.getByText('Generation failed')).toBeInTheDocument();
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Generation failed. Please retry.',
    );

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('hides failed-state details when no message is provided', () => {
    renderActionBar({
      hasChanges: false,
      status: VoiceoverStatus.FAILED,
      errorMessage: null,
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
