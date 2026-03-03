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
  VersionHistoryStrip: (props: Record<string, unknown>) => (
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
  ),
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

function createMockInfographic(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: 'infographic-1',
    title: 'Test Infographic',
    approvedBy: null,
    imageStorageKey: null,
    errorMessage: null,
    format: 'portrait',
    status: 'ready',
    updatedAt: '2026-02-20T14:00:00.000Z',
    ...overrides,
  };
}

function createMockSettings(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    ...overrides,
  };
}

function createMockVersions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: [],
    isLoading: false,
    ...overrides,
  };
}

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

const setInfographic = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useInfographic).mockReturnValue({
    data: createMockInfographic(overrides),
  } as never);
};

const setSettings = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useInfographicSettings).mockReturnValue(
    createMockSettings(overrides) as never,
  );
};

const setVersions = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useInfographicVersions).mockReturnValue(
    createMockVersions(overrides) as never,
  );
};

const setActions = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useInfographicActions).mockReturnValue(
    createMockActions(overrides) as never,
  );
};

const renderWorkbench = () =>
  renderWithQuery(
    <InfographicWorkbenchContainer infographicId="infographic-1" />,
  );

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
    vi.mocked(useApproveInfographic).mockReturnValue({
      approve: { mutate: vi.fn(), isPending: false },
      revoke: { mutate: vi.fn(), isPending: false },
    } as never);

    setInfographic();
    setSettings();
    setVersions();
    setActions();
  });

  it.each([
    {
      name: 'blocks navigation when there are unsaved changes and no generation',
      isGenerating: false,
      shouldBlock: true,
    },
    {
      name: 'does not block navigation while generation is running',
      isGenerating: true,
      shouldBlock: false,
    },
  ])('$name', ({ isGenerating, shouldBlock }) => {
    setActions({ hasChanges: true, isGenerating });

    renderWorkbench();

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock,
    });
  });

  it('starts with a blank iteration prompt for existing images', () => {
    setInfographic({ imageStorageKey: 'infographics/one.png' });

    renderWorkbench();

    expect(
      getLastPromptPanelProps<{
        prompt: string;
        isEditMode: boolean;
      }>(),
    ).toMatchObject({
      prompt: '',
      isEditMode: true,
    });
    expect(
      screen.getByRole('button', { name: 'Save & Regenerate' }),
    ).toBeDisabled();
  });

  it('passes typed iteration prompt to generate action', async () => {
    const actions = createMockActions();
    setInfographic({ imageStorageKey: 'infographics/one.png' });
    setActions(actions);

    renderWorkbench();

    act(() => {
      getLastPromptPanelProps<{
        onPromptChange: (value: string) => void;
      }>()?.onPromptChange('Make the title larger');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' }));

    expect(actions.handleGenerate).toHaveBeenCalledWith(
      'Make the title larger',
    );

    await waitFor(() => {
      expect(getLastPromptPanelProps<{ prompt: string }>()?.prompt).toBe('');
    });
  });

  it('shows explicit viewing/base messaging when a historical version is selected', () => {
    setInfographic({ imageStorageKey: 'infographics/latest.png' });
    setVersions({
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
    });

    renderWorkbench();

    fireEvent.click(screen.getByRole('button', { name: /select version 1/i }));

    expect(
      screen.getByRole('button', { name: /generate from base v2/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Viewing v1\. New generations will use latest base v2/i),
    ).toBeInTheDocument();
  });
});
