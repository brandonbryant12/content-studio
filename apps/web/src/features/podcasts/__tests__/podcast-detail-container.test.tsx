import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as FileDownloadModule from '@/shared/lib/file-download';
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

const { podcastDetailSpy, downloadFromUrlSpy, downloadTextFileSpy } =
  vi.hoisted(() => ({
    podcastDetailSpy: vi.fn(),
    downloadFromUrlSpy: vi.fn(),
    downloadTextFileSpy: vi.fn(),
  }));

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
  PodcastDetail: (props: Record<string, unknown>) => {
    podcastDetailSpy(props);
    return <div data-testid="podcast-detail" />;
  },
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

vi.mock('@/shared/lib/file-download', async () => {
  const actual = await vi.importActual<typeof FileDownloadModule>(
    '@/shared/lib/file-download',
  );

  return {
    ...actual,
    downloadFromUrl: downloadFromUrlSpy,
    downloadTextFile: downloadTextFileSpy,
  };
});

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

function getLastPodcastDetailProps<T>(): T | undefined {
  const lastCall =
    podcastDetailSpy.mock.calls[podcastDetailSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
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
        updatedAt: '2026-02-20T14:00:00.000Z',
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

  it('uses smart filename when exporting audio', () => {
    vi.mocked(usePodcast).mockReturnValue({
      data: {
        id: 'podcast-1',
        title: 'Market Update',
        status: 'ready',
        segments: [],
        documents: [],
        approvedBy: null,
        audioUrl: 'https://cdn.example.com/audio/final.wav?x=1',
        duration: 120,
        updatedAt: '2026-02-20T14:00:00.000Z',
      },
    } as never);
    vi.mocked(usePodcastActions).mockReturnValue(createMockActions() as never);

    render(<PodcastDetailContainer podcastId="podcast-1" />);

    const props = getLastPodcastDetailProps<{ onExportAudio?: () => void }>();
    props?.onExportAudio?.();

    expect(downloadFromUrlSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/audio/final.wav?x=1',
      'market-update-audio-20260220.wav',
    );
  });

  it('uses smart filename when exporting script', () => {
    vi.mocked(useScriptEditor).mockReturnValue({
      segments: [{ speaker: 'Host', line: 'Hello', index: 0 }],
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
    vi.mocked(usePodcastActions).mockReturnValue(createMockActions() as never);

    render(<PodcastDetailContainer podcastId="podcast-1" />);

    const props = getLastPodcastDetailProps<{ onExportScript?: () => void }>();
    props?.onExportScript?.();

    expect(downloadTextFileSpy).toHaveBeenCalledWith(
      expect.any(String),
      'test-podcast-script-20260220.md',
      'text/markdown;charset=utf-8',
    );
  });
});
