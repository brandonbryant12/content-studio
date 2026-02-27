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
import { act, fireEvent, renderWithQuery, screen, waitFor } from '@/test-utils';

const { promptPanelSpy, versionHistoryStripSpy } = vi.hoisted(() => ({
  promptPanelSpy: vi.fn(),
  versionHistoryStripSpy: vi.fn(),
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
  VersionHistoryStrip: (props: Record<string, unknown>) => {
    versionHistoryStripSpy(props);

    return (
      <div data-testid="version-history-strip">
        <button
          type="button"
          onClick={() => {
            const onSelectVersion = props.onSelectVersion as
              | ((id: string) => void)
              | undefined;
            onSelectVersion?.('version-1');
          }}
        >
          Select version 1
        </button>
      </div>
    );
  },
}));

vi.mock('@/shared/components/approval/approve-button', () => ({
  ApproveButton: () => <div data-testid="approve-button" />,
}));

vi.mock('@/shared/components/confirmation-dialog/confirmation-dialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
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

    renderWithQuery(
      <InfographicWorkbenchContainer infographicId="infographic-1" />,
    );

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: true,
    });
  });

  it('does not block navigation while generation is running', () => {
    vi.mocked(useInfographicActions).mockReturnValue(
      createMockActions({ hasChanges: true, isGenerating: true }) as never,
    );

    renderWithQuery(
      <InfographicWorkbenchContainer infographicId="infographic-1" />,
    );

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

    renderWithQuery(
      <InfographicWorkbenchContainer infographicId="infographic-1" />,
    );

    const promptPanelProps = getLastPromptPanelProps<{
      prompt: string;
      isEditMode: boolean;
    }>();
    expect(promptPanelProps).toMatchObject({
      prompt: '',
      isEditMode: true,
    });
    expect(
      screen.getByRole('button', { name: 'Save & Regenerate' }),
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

    renderWithQuery(
      <InfographicWorkbenchContainer infographicId="infographic-1" />,
    );

    const initialPromptPanelProps = getLastPromptPanelProps<{
      onPromptChange: (value: string) => void;
    }>();

    act(() => {
      initialPromptPanelProps?.onPromptChange('Make the title larger');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' }));

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

  it('shows explicit viewing/base messaging when a historical version is selected', () => {
    vi.mocked(useInfographic).mockReturnValue({
      data: {
        id: 'infographic-1',
        title: 'Test Infographic',
        approvedBy: null,
        imageStorageKey: 'infographics/latest.png',
        errorMessage: null,
      },
    } as never);
    vi.mocked(useInfographicVersions).mockReturnValue({
      data: [
        {
          id: 'version-1',
          versionNumber: 1,
          imageStorageKey: 'infographics/v1.png',
          thumbnailStorageKey: null,
          format: 'portrait',
          prompt: '',
          styleProperties: [],
          createdAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'version-2',
          versionNumber: 2,
          imageStorageKey: 'infographics/v2.png',
          thumbnailStorageKey: null,
          format: 'portrait',
          prompt: '',
          styleProperties: [],
          createdAt: '2025-01-02T00:00:00Z',
        },
      ],
      isLoading: false,
    } as never);
    vi.mocked(useInfographicActions).mockReturnValue(
      createMockActions() as never,
    );

    renderWithQuery(
      <InfographicWorkbenchContainer infographicId="infographic-1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select version 1/i }));

    expect(
      screen.getByRole('button', { name: /generate from base v2/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Viewing v1\. New generations will use latest base v2/i),
    ).toBeInTheDocument();
  });
});
