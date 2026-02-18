import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { InfographicWorkbenchContainer } from '../components/infographic-workbench-container';
import { useApproveInfographic } from '../hooks/use-approve-infographic';
import { useInfographic } from '../hooks/use-infographic';
import { useInfographicActions } from '../hooks/use-infographic-actions';
import { useInfographicSettings } from '../hooks/use-infographic-settings';
import { useInfographicVersions } from '../hooks/use-infographic-versions';
import { useNavigationBlock, useSessionGuard } from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils';

const { promptPanelSpy } = vi.hoisted(() => ({
  promptPanelSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

vi.mock('../hooks/use-infographic', () => ({
  useInfographic: vi.fn(),
}));

vi.mock('../hooks/use-infographic-settings', () => ({
  useInfographicSettings: vi.fn(),
}));

vi.mock('../hooks/use-infographic-actions', () => ({
  useInfographicActions: vi.fn(),
}));

vi.mock('../hooks/use-infographic-versions', () => ({
  useInfographicVersions: vi.fn(),
}));

vi.mock('../hooks/use-approve-infographic', () => ({
  useApproveInfographic: vi.fn(),
}));

vi.mock('@/shared/hooks', () => ({
  useSessionGuard: vi.fn(),
  useKeyboardShortcut: vi.fn(),
  useNavigationBlock: vi.fn(),
}));

vi.mock('@/shared/hooks/use-is-admin', () => ({
  useIsAdmin: vi.fn(),
}));

vi.mock('../components/export-dropdown', () => ({
  ExportDropdown: () => <div data-testid="export-dropdown" />,
}));

vi.mock('../components/format-selector', () => ({
  FormatSelector: () => <div data-testid="format-selector" />,
}));

vi.mock('../components/preview-panel', () => ({
  PreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock('../components/prompt-panel', () => ({
  PromptPanel: (
    props: ComponentProps<'textarea'> & Record<string, unknown>,
  ) => {
    promptPanelSpy(props);
    return <div data-testid="prompt-panel" />;
  },
}));

vi.mock('../components/style-section', () => ({
  StyleSection: () => <div data-testid="style-section" />,
}));

vi.mock('../components/version-history-strip', () => ({
  VersionHistoryStrip: () => <div data-testid="version-history-strip" />,
}));

vi.mock('@/shared/components/approval/approve-button', () => ({
  ApproveButton: () => <div data-testid="approve-button" />,
}));

vi.mock('@/shared/components/confirmation-dialog/confirmation-dialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/shared/lib/storage-url', () => ({
  getStorageUrl: (key: string) => `/storage/${key}`,
}));

function createMockActions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hasChanges: false,
    isSaving: false,
    isGenerating: false,
    isPendingGeneration: false,
    isDeleting: false,
    hasPrompt: true,
    handleSave: vi.fn(),
    handleGenerate: vi.fn(),
    handleDelete: vi.fn(),
    ...overrides,
  };
}

function getLastPromptPanelProps<T>(): T | undefined {
  const lastCall =
    promptPanelSpy.mock.calls[promptPanelSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
}

describe('InfographicWorkbenchContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSessionGuard).mockReturnValue({
      user: { id: 'user-1' },
    } as never);
    vi.mocked(useIsAdmin).mockReturnValue(false);

    vi.mocked(useInfographic).mockReturnValue({
      data: {
        id: 'infographic-1',
        title: 'Test Infographic',
        approvedBy: null,
        imageStorageKey: null,
        errorMessage: null,
      },
    } as never);

    vi.mocked(useInfographicSettings).mockReturnValue({
      prompt: 'Create an infographic',
      styleProperties: [],
      format: 'portrait',
      setPrompt: vi.fn(),
      setStyleProperties: vi.fn(),
      setFormat: vi.fn(),
      hasChanges: false,
      isSaving: false,
      saveSettings: vi.fn(),
      discardChanges: vi.fn(),
    } as never);

    vi.mocked(useInfographicVersions).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    vi.mocked(useApproveInfographic).mockReturnValue({
      approve: { mutate: vi.fn(), isPending: false },
      revoke: { mutate: vi.fn(), isPending: false },
    } as never);
  });

  it('blocks navigation when there are unsaved changes and no generation', () => {
    vi.mocked(useInfographicActions).mockReturnValue(
      createMockActions({ hasChanges: true, isGenerating: false }) as never,
    );

    render(<InfographicWorkbenchContainer infographicId="infographic-1" />);

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: true,
    });
  });

  it('does not block navigation while generation is running', () => {
    vi.mocked(useInfographicActions).mockReturnValue(
      createMockActions({ hasChanges: true, isGenerating: true }) as never,
    );

    render(<InfographicWorkbenchContainer infographicId="infographic-1" />);

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: false,
    });
  });

  it('starts with a blank iteration prompt for existing images', () => {
    vi.mocked(useInfographic).mockReturnValue({
      data: {
        id: 'infographic-1',
        title: 'Test Infographic',
        approvedBy: null,
        imageStorageKey: 'infographics/one.png',
        errorMessage: null,
      },
    } as never);
    vi.mocked(useInfographicActions).mockReturnValue(
      createMockActions() as never,
    );

    render(<InfographicWorkbenchContainer infographicId="infographic-1" />);

    const promptPanelProps = getLastPromptPanelProps<{
      prompt: string;
      isEditMode: boolean;
    }>();
    expect(promptPanelProps).toMatchObject({
      prompt: '',
      isEditMode: true,
    });
    expect(
      screen.getByRole('button', { name: 'Generate New Version' }),
    ).toBeDisabled();
  });

  it('passes typed iteration prompt to generate action', async () => {
    vi.mocked(useInfographic).mockReturnValue({
      data: {
        id: 'infographic-1',
        title: 'Test Infographic',
        approvedBy: null,
        imageStorageKey: 'infographics/one.png',
        errorMessage: null,
      },
    } as never);
    const actions = createMockActions();
    vi.mocked(useInfographicActions).mockReturnValue(actions as never);

    render(<InfographicWorkbenchContainer infographicId="infographic-1" />);

    const initialPromptPanelProps = getLastPromptPanelProps<{
      onPromptChange: (value: string) => void;
    }>();

    act(() => {
      initialPromptPanelProps?.onPromptChange('Make the title larger');
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Generate New Version' }),
    );

    expect(actions.handleGenerate).toHaveBeenCalledWith(
      'Make the title larger',
    );

    await waitFor(() => {
      const latestPromptPanelProps = getLastPromptPanelProps<{
        prompt: string;
      }>();
      expect(latestPromptPanelProps?.prompt).toBe('');
    });
  });
});
