// features/voiceovers/__tests__/action-bar.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { ActionBar } from '../components/workbench/action-bar';
import { VoiceoverStatus } from '../lib/status';

// Mock the Spinner component
vi.mock('@repo/ui/components/spinner', () => ({
  Spinner: ({ className }: { className?: string }) => (
    <span data-testid="spinner" className={className}>
      Loading...
    </span>
  ),
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
  isGenerating: boolean;
  hasChanges: boolean;
  hasText: boolean;
  isSaving: boolean;
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
    onGenerate: vi.fn(),
    ...overrides,
  };
}

describe('ActionBar', () => {
  describe('during generation', () => {
    it('shows generating progress state', () => {
      render(<ActionBar {...createDefaultProps({ isGenerating: true })} />);

      expect(screen.getByText('Generating audio...')).toBeInTheDocument();
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

    it('shows Save & Regenerate button', () => {
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

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
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

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('with unsaved changes and hasText (drafting)', () => {
    it('shows Save & Generate button', () => {
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
        screen.getByRole('button', { name: /save & generate/i }),
      ).toBeInTheDocument();
    });

    it('calls onGenerate when Save & Generate clicked', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /save & generate/i }));
      expect(onGenerate).toHaveBeenCalled();
    });

    it('disables Save & Generate while saving', () => {
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

      expect(screen.getByRole('button')).toBeDisabled();
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
  });
});
