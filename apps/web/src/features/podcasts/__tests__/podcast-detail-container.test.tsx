import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PodcastDetailContainer } from '../components/podcast-detail-container';
import { useApprovePodcast } from '../hooks/use-approve-podcast';
import { useDocumentSelection } from '../hooks/use-document-selection';
import { usePodcast } from '../hooks/use-podcast';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useScriptEditor } from '../hooks/use-script-editor';
import { isSetupMode } from '../lib/status';
import { useNavigationBlock, useSessionGuard } from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { render } from '@/test-utils';

vi.mock('../hooks/use-podcast', () => ({
  usePodcast: vi.fn(),
}));

vi.mock('../hooks/use-script-editor', () => ({
  useScriptEditor: vi.fn(),
}));

vi.mock('../hooks/use-podcast-settings', () => ({
  usePodcastSettings: vi.fn(),
}));

vi.mock('../hooks/use-document-selection', () => ({
  useDocumentSelection: vi.fn(),
}));

vi.mock('../hooks/use-podcast-actions', () => ({
  usePodcastActions: vi.fn(),
}));

vi.mock('../hooks/use-approve-podcast', () => ({
  useApprovePodcast: vi.fn(),
}));

vi.mock('../lib/status', () => ({
  isSetupMode: vi.fn(),
}));

vi.mock('../components/podcast-detail', () => ({
  PodcastDetail: () => <div data-testid="podcast-detail" />,
}));

vi.mock('../components/setup-wizard-container', () => ({
  SetupWizardContainer: () => <div data-testid="setup-wizard" />,
}));

vi.mock('@/shared/hooks', () => ({
  useKeyboardShortcut: vi.fn(),
  useNavigationBlock: vi.fn(),
  useSessionGuard: vi.fn(),
}));

vi.mock('@/shared/hooks/use-is-admin', () => ({
  useIsAdmin: vi.fn(),
}));

function createMockActions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hasAnyChanges: false,
    isSaving: false,
    isGenerating: false,
    isPendingGeneration: false,
    isDeleting: false,
    handleSave: vi.fn(),
    handleGenerate: vi.fn(),
    handleDelete: vi.fn(),
    ...overrides,
  };
}

describe('PodcastDetailContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSessionGuard).mockReturnValue({
      user: { id: 'user-1' },
    } as never);
    vi.mocked(useIsAdmin).mockReturnValue(false);

    vi.mocked(usePodcast).mockReturnValue({
      data: {
        id: 'podcast-1',
        title: 'Test Podcast',
        status: 'ready',
        segments: [],
        documents: [],
        approvedBy: null,
        audioUrl: null,
        duration: null,
      },
    } as never);

    vi.mocked(useScriptEditor).mockReturnValue({
      segments: [],
      hasChanges: false,
      isSaving: false,
      updateSegment: vi.fn(),
      addSegment: vi.fn(),
      removeSegment: vi.fn(),
      reorderSegments: vi.fn(),
      saveChanges: vi.fn(),
      discardChanges: vi.fn(),
      resetToSegments: vi.fn(),
    } as never);

    vi.mocked(usePodcastSettings).mockReturnValue({
      hostVoice: 'Aoede',
      coHostVoice: 'Charon',
      targetDuration: 5,
      instructions: '',
      hostPersonaId: null,
      coHostPersonaId: null,
      hostPersonaVoiceId: null,
      coHostPersonaVoiceId: null,
      voiceConflict: false,
      setHostVoice: vi.fn(),
      setCoHostVoice: vi.fn(),
      setTargetDuration: vi.fn(),
      setInstructions: vi.fn(),
      setHostPersona: vi.fn(),
      setCoHostPersona: vi.fn(),
      hasChanges: false,
      hasScriptSettingsChanges: false,
      isSaving: false,
      saveSettings: vi.fn(),
      discardChanges: vi.fn(),
    } as never);

    vi.mocked(useDocumentSelection).mockReturnValue({
      documents: [],
      documentIds: [],
      addDocuments: vi.fn(),
      removeDocument: vi.fn(),
      discardChanges: vi.fn(),
      hasChanges: false,
    } as never);

    vi.mocked(useApprovePodcast).mockReturnValue({
      approve: { mutate: vi.fn(), isPending: false },
      revoke: { mutate: vi.fn(), isPending: false },
    } as never);

    vi.mocked(isSetupMode).mockReturnValue(false);
  });

  it('blocks navigation when there are unsaved changes and no generation', () => {
    vi.mocked(usePodcastActions).mockReturnValue(
      createMockActions({ hasAnyChanges: true, isGenerating: false }) as never,
    );

    render(<PodcastDetailContainer podcastId="podcast-1" />);

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: true,
    });
  });

  it('does not block navigation while generation is running', () => {
    vi.mocked(usePodcastActions).mockReturnValue(
      createMockActions({ hasAnyChanges: true, isGenerating: true }) as never,
    );

    render(<PodcastDetailContainer podcastId="podcast-1" />);

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: false,
    });
  });
});
