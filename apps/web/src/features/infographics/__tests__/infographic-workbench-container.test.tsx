import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InfographicWorkbenchContainer } from '../components/infographic-workbench-container';
import { useApproveInfographic } from '../hooks/use-approve-infographic';
import { useInfographic } from '../hooks/use-infographic';
import { useInfographicActions } from '../hooks/use-infographic-actions';
import { useInfographicSettings } from '../hooks/use-infographic-settings';
import { useInfographicVersions } from '../hooks/use-infographic-versions';
import { useDocumentList } from '@/features/documents/hooks/use-document-list';
import {
  useNavigationBlock,
  useSessionGuard,
  useDocumentSelection,
} from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { render } from '@/test-utils';

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

vi.mock('@/features/documents/hooks/use-document-list', () => ({
  useDocumentList: vi.fn(),
}));

vi.mock('@/shared/hooks', () => ({
  useSessionGuard: vi.fn(),
  useKeyboardShortcut: vi.fn(),
  useNavigationBlock: vi.fn(),
  useDocumentSelection: vi.fn(),
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
  PromptPanel: () => <div data-testid="prompt-panel" />,
}));

vi.mock('../components/style-selector', () => ({
  StyleSelector: () => <div data-testid="style-selector" />,
}));

vi.mock('../components/type-selector', () => ({
  TypeSelector: () => <div data-testid="type-selector" />,
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

vi.mock('@/shared/components/document-manager', () => ({
  DocumentManager: () => <div data-testid="document-manager" />,
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
        sourceDocumentIds: [],
        imageStorageKey: null,
        errorMessage: null,
      },
    } as never);

    vi.mocked(useInfographicSettings).mockReturnValue({
      prompt: 'Create an infographic',
      infographicType: 'key_takeaways',
      stylePreset: 'modern_minimal',
      format: 'portrait',
      setPrompt: vi.fn(),
      setInfographicType: vi.fn(),
      setStylePreset: vi.fn(),
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

    vi.mocked(useDocumentList).mockReturnValue({
      data: [],
    } as never);

    vi.mocked(useDocumentSelection).mockReturnValue({
      documents: [],
      documentIds: [],
      addDocuments: vi.fn(),
      removeDocument: vi.fn(),
      discardChanges: vi.fn(),
      hasChanges: false,
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
});
