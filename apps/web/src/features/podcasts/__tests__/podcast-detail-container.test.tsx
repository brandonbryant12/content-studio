import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as FileDownloadModule from '@/shared/lib/file-download';
import { PodcastDetailContainer } from '../components/podcast-detail-container';
import { useApprovePodcast } from '../hooks/use-approve-podcast';
import { usePodcast } from '../hooks/use-podcast';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useScriptEditor } from '../hooks/use-script-editor';
import { useSourceSelection } from '../hooks/use-source-selection';
import { isSetupMode } from '../lib/status';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { act, render, waitFor } from '@/test-utils';

const PODCAST_UPDATED_AT = '2026-02-20T14:00:00.000Z';

const {
  podcastDetailSpy,
  downloadFromUrlSpy,
  downloadTextFileSpy,
  confirmationDialogSpy,
} = vi.hoisted(() => ({
  podcastDetailSpy: vi.fn(),
  downloadFromUrlSpy: vi.fn(),
  downloadTextFileSpy: vi.fn(),
  confirmationDialogSpy: vi.fn(),
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

vi.mock('../hooks/use-source-selection', () => ({
  useSourceSelection: vi.fn(),
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

vi.mock('../components/setup', () => ({
  SetupWizard: () => <div data-testid="setup-wizard" />,
}));

vi.mock('@/shared/components/confirmation-dialog/confirmation-dialog', () => ({
  ConfirmationDialog: (props: Record<string, unknown>) => {
    confirmationDialogSpy(props);
    return null;
  },
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

function createMockPodcast(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'podcast-1',
    title: 'Test Podcast',
    status: 'ready',
    segments: [],
    sources: [],
    approvedBy: null,
    audioUrl: null,
    duration: null,
    summary: null,
    updatedAt: PODCAST_UPDATED_AT,
    ...overrides,
  };
}

function createMockScriptEditor(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
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
    ...overrides,
  };
}

function createMockActions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hasAnyChanges: false,
    isSaving: false,
    isGenerating: false,
    isPendingGeneration: false,
    isDeleting: false,
    needsFullRegeneration: false,
    handleSave: vi.fn(),
    handleGenerate: vi.fn(),
    handleDelete: vi.fn(),
    ...overrides,
  };
}

const setPodcast = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(usePodcast).mockReturnValue({
    data: createMockPodcast(overrides),
  } as never);
};

const setScriptEditor = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useScriptEditor).mockReturnValue(
    createMockScriptEditor(overrides) as never,
  );
};

const setActions = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(usePodcastActions).mockReturnValue(
    createMockActions(overrides) as never,
  );
};

const renderContainer = () =>
  render(<PodcastDetailContainer podcastId="podcast-1" />);

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
    vi.mocked(useSourceSelection).mockReturnValue({
      sources: [],
      sourceIds: [],
      addSources: vi.fn(),
      removeSource: vi.fn(),
      discardChanges: vi.fn(),
      hasChanges: false,
    } as never);
    vi.mocked(useApprovePodcast).mockReturnValue({
      approve: { mutate: vi.fn(), isPending: false },
      revoke: { mutate: vi.fn(), isPending: false },
    } as never);
    vi.mocked(isSetupMode).mockReturnValue(false);

    setPodcast();
    setScriptEditor();
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
    setActions({ hasAnyChanges: true, isGenerating });

    renderContainer();

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock,
    });
  });

  it('enables save shortcut in failed state with unsaved changes', () => {
    const handleSave = vi.fn();
    setPodcast({ status: 'failed' });
    setActions({ hasAnyChanges: true, handleSave });

    renderContainer();

    const shortcutConfig = vi.mocked(useKeyboardShortcut).mock.calls[
      vi.mocked(useKeyboardShortcut).mock.calls.length - 1
    ]?.[0] as
      | {
          enabled?: boolean;
          onTrigger?: () => void;
        }
      | undefined;
    expect(shortcutConfig?.enabled).toBe(true);

    act(() => {
      shortcutConfig?.onTrigger?.();
    });
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('uses smart filename when exporting audio', () => {
    setPodcast({
      title: 'Market Update',
      audioUrl: 'https://cdn.example.com/audio/final.wav?x=1',
      duration: 120,
    });

    renderContainer();

    getLastPodcastDetailProps<{
      onExportAudio?: () => void;
    }>()?.onExportAudio?.();

    expect(downloadFromUrlSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/audio/final.wav?x=1',
      'market-update-audio-20260220.wav',
    );
  });

  it('uses smart filename when exporting script', () => {
    setScriptEditor({
      segments: [{ speaker: 'Host', line: 'Hello', index: 0 }],
    });

    renderContainer();

    getLastPodcastDetailProps<{
      onExportScript?: () => void;
    }>()?.onExportScript?.();

    expect(downloadTextFileSpy).toHaveBeenCalledWith(
      expect.any(String),
      'test-podcast-script-20260220.md',
      'text/markdown;charset=utf-8',
    );
  });

  it('opens confirmation dialog before full regeneration save', async () => {
    const handleSave = vi.fn();
    setActions({
      needsFullRegeneration: true,
      hasAnyChanges: true,
      handleSave,
    });

    renderContainer();

    act(() => {
      getLastPodcastDetailProps<{ onSave?: () => void }>()?.onSave?.();
    });

    expect(handleSave).not.toHaveBeenCalled();

    const getLatestConfirmation = () =>
      confirmationDialogSpy.mock.calls[
        confirmationDialogSpy.mock.calls.length - 1
      ]?.[0] as
        | {
            open?: boolean;
            title?: string;
            onConfirm?: () => void;
          }
        | undefined;

    await waitFor(() => {
      expect(getLatestConfirmation()?.open).toBe(true);
    });

    const confirmation = getLatestConfirmation();
    expect(confirmation?.title).toBe('Regenerate podcast from scratch?');

    confirmation?.onConfirm?.();
    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});
