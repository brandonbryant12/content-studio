// features/voiceovers/__tests__/action-bar.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { ActionBar } from '../components/workbench/action-bar';
import { VoiceoverStatus } from '../lib/status';
import { render, screen, fireEvent } from '@/test-utils';

// Mock the Spinner component
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

// Mock the Button component
vi.mock('@repo/ui/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    className,
  }: {
    children: React.ReactNode;
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

function createDefaultProps(
  overrides: Partial<ActionBarProps> = {},
): ActionBarProps {
  return {
    status: VoiceoverStatus.DRAFTING,
    isGenerating: false,
    hasChanges: false,
    hasText: true,
    isSaving: false,
    onSave: vi.fn(),
    onGenerate: vi.fn(),
    ...overrides,
  };
}

describe('ActionBar', () => {
  describe('during generation', () => {
    it('shows generating progress state', () => {
      render(<ActionBar {...createDefaultProps({ isGenerating: true })} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('does not show action buttons while generating', () => {
      render(<ActionBar {...createDefaultProps({ isGenerating: true })} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('with unsaved changes and ready status', () => {
    it('shows unsaved changes indicator', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
          })}
        />,
      );

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('shows Save Draft button', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /save draft/i }),
      ).toBeInTheDocument();
    });

    it('shows Save & Regenerate button when text is present', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /save & regenerate/i }),
      ).toBeInTheDocument();
    });

    it('calls onSave when Save Draft clicked', () => {
      const onSave = vi.fn();
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
            onSave,
          })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
      expect(onSave).toHaveBeenCalled();
    });

    it('calls onGenerate when Save & Regenerate clicked', () => {
      const onGenerate = vi.fn();
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
            onGenerate,
          })}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: /save & regenerate/i }),
      );
      expect(onGenerate).toHaveBeenCalled();
    });

    it('disables Save Draft button while saving', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
            isSaving: true,
          })}
        />,
      );

      expect(
        screen.getAllByRole('button', { name: /saving/i })[0],
      ).toBeDisabled();
    });

    it('disables Save & Regenerate button while saving', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
            isSaving: true,
          })}
        />,
      );

      const savingButtons = screen.getAllByRole('button', { name: /saving/i });
      expect(savingButtons).toHaveLength(2);
      expect(savingButtons.every((button) => button.hasAttribute('disabled'))).toBe(
        true,
      );
    });

    it('shows saving spinner when saving', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.READY,
            isSaving: true,
          })}
        />,
      );

      expect(screen.getAllByText('Saving...')).toHaveLength(2);
      expect(screen.getAllByTestId('spinner')).toHaveLength(2);
    });
  });

  describe('with unsaved changes and hasText (drafting)', () => {
    it('shows Save Draft and Save & Regenerate buttons', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.DRAFTING,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /save draft/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /save & regenerate/i }),
      ).toBeInTheDocument();
    });

    it('calls onGenerate when Save & Regenerate clicked', () => {
      const onGenerate = vi.fn();
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.DRAFTING,
            onGenerate,
          })}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: /save & regenerate/i }),
      );
      expect(onGenerate).toHaveBeenCalled();
    });

    it('disables both save and regenerate while saving', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: true,
            status: VoiceoverStatus.DRAFTING,
            isSaving: true,
          })}
        />,
      );

      const savingButtons = screen.getAllByRole('button', { name: /saving/i });
      expect(savingButtons).toHaveLength(2);
      expect(savingButtons.every((button) => button.hasAttribute('disabled'))).toBe(
        true,
      );
    });
  });

  describe('with unsaved changes but no text', () => {
    it('shows Save Draft button without regenerate button', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: true,
            hasText: false,
            status: VoiceoverStatus.DRAFTING,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /save draft/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /save & regenerate/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('no changes - drafting status with text', () => {
    it('shows Generate Audio button', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            hasText: true,
            status: VoiceoverStatus.DRAFTING,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /generate audio/i }),
      ).toBeInTheDocument();
    });

    it('calls onGenerate when Generate Audio clicked', () => {
      const onGenerate = vi.fn();
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            hasText: true,
            status: VoiceoverStatus.DRAFTING,
            onGenerate,
          })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /generate audio/i }));
      expect(onGenerate).toHaveBeenCalled();
    });

    it('disables Generate Audio when disabled prop is true', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            hasText: true,
            status: VoiceoverStatus.DRAFTING,
            disabled: true,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /generate audio/i }),
      ).toBeDisabled();
    });
  });

  describe('no changes - drafting without text', () => {
    it('shows Draft status', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            hasText: false,
            status: VoiceoverStatus.DRAFTING,
          })}
        />,
      );

      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument();
    });

    it('does not show Generate Audio button', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            hasText: false,
            status: VoiceoverStatus.DRAFTING,
          })}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /generate/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('no changes - ready status', () => {
    it('shows Ready status', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.READY,
          })}
        />,
      );

      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument();
    });

    it('does not show action buttons', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.READY,
          })}
        />,
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('no changes - failed status', () => {
    it('shows Generation failed status', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.FAILED,
          })}
        />,
      );

      expect(screen.getByText('Generation failed')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });

    it('shows Retry button', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.FAILED,
          })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('calls onGenerate when Retry clicked', () => {
      const onGenerate = vi.fn();
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.FAILED,
            onGenerate,
          })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onGenerate).toHaveBeenCalled();
    });

    it('maps unknown failure details to safe retry copy', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.FAILED,
            errorMessage: 'TTS provider timeout',
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Generation failed. Please retry.',
      );
    });

    it('does not show failure details when message is missing', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            hasChanges: false,
            status: VoiceoverStatus.FAILED,
            errorMessage: null,
          })}
        />,
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('error panel visibility guardrails', () => {
    it('hides failure details during active generation', () => {
      render(
        <ActionBar
          {...createDefaultProps({
            isGenerating: true,
            status: VoiceoverStatus.FAILED,
            errorMessage: 'Previous generation failed',
          })}
        />,
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
