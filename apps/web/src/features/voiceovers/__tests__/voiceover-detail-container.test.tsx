import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as FileDownloadModule from '@/shared/lib/file-download';
import { VoiceoverDetailContainer } from '../components/voiceover-detail-container';
import { useApproveVoiceover } from '../hooks/use-approve-voiceover';
import { useVoiceover } from '../hooks/use-voiceover';
import { useVoiceoverActions } from '../hooks/use-voiceover-actions';
import { useVoiceoverSettings } from '../hooks/use-voiceover-settings';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
  useIsAdmin,
} from '@/shared/hooks';
import { render } from '@/test-utils';

const { voiceoverDetailSpy, downloadFromUrlSpy, downloadTextFileSpy } =
  vi.hoisted(() => ({
    voiceoverDetailSpy: vi.fn(),
    downloadFromUrlSpy: vi.fn(),
    downloadTextFileSpy: vi.fn(),
  }));

vi.mock('../hooks/use-voiceover', () => ({
  useVoiceover: vi.fn(),
}));

vi.mock('../hooks/use-voiceover-settings', () => ({
  useVoiceoverSettings: vi.fn(),
}));

vi.mock('../hooks/use-voiceover-actions', () => ({
  useVoiceoverActions: vi.fn(),
}));

vi.mock('../hooks/use-approve-voiceover', () => ({
  useApproveVoiceover: vi.fn(),
}));

vi.mock('../components/voiceover-detail', () => ({
  VoiceoverDetail: (props: Record<string, unknown>) => {
    voiceoverDetailSpy(props);
    return <div data-testid="voiceover-detail" />;
  },
}));

vi.mock('../components/workbench/writing-assistant-container', () => ({
  WritingAssistantContainer: () => <div data-testid="writing-assistant" />,
}));

vi.mock('@/shared/hooks', () => ({
  useKeyboardShortcut: vi.fn(),
  useNavigationBlock: vi
    .fn()
    .mockReturnValue({ isBlocked: false, proceed: vi.fn(), reset: vi.fn() }),
  useSessionGuard: vi.fn(),
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

function createMockVoiceover(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'voiceover-1',
    title: 'Test Voiceover',
    status: 'drafting',
    approvedBy: null,
    audioUrl: null,
    duration: null,
    voiceName: 'Charon',
    updatedAt: '2026-02-20T14:00:00.000Z',
    ...overrides,
  };
}

function createMockSettings(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: 'Test Voiceover',
    text: 'Hello world',
    voice: 'Charon',
    setTitle: vi.fn(),
    setText: vi.fn(),
    setVoice: vi.fn(),
    hasTitleChanges: false,
    hasChanges: false,
    isSaving: false,
    saveSettings: vi.fn(),
    discardChanges: vi.fn(),
    ...overrides,
  };
}

function createMockActions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hasChanges: false,
    hasText: true,
    isSaving: false,
    isGenerating: false,
    isPendingGeneration: false,
    isDeleting: false,
    handleGenerate: vi.fn(),
    handleDelete: vi.fn(),
    ...overrides,
  };
}

const setVoiceover = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useVoiceover).mockReturnValue({
    data: createMockVoiceover(overrides),
  } as never);
};

const setSettings = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useVoiceoverSettings).mockReturnValue(
    createMockSettings(overrides) as never,
  );
};

const setActions = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(useVoiceoverActions).mockReturnValue(
    createMockActions(overrides) as never,
  );
};

const renderContainer = () =>
  render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

function getLastVoiceoverDetailProps<T>(): T | undefined {
  const lastCall =
    voiceoverDetailSpy.mock.calls[voiceoverDetailSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
}

function getShortcutConfig(
  key: string,
): { onTrigger?: () => void; enabled?: boolean } | undefined {
  const call = vi
    .mocked(useKeyboardShortcut)
    .mock.calls.find(([opts]) => opts.key === key && opts.cmdOrCtrl === true);
  return call?.[0] as { onTrigger?: () => void; enabled?: boolean } | undefined;
}

describe('VoiceoverDetailContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigationBlock).mockReturnValue({
      isBlocked: false,
      proceed: vi.fn(),
      reset: vi.fn(),
    });
    vi.mocked(useSessionGuard).mockReturnValue({
      user: { id: 'user-1' },
    } as never);
    vi.mocked(useIsAdmin).mockReturnValue(false);
    vi.mocked(useApproveVoiceover).mockReturnValue({
      approve: { mutate: vi.fn(), isPending: false },
      revoke: { mutate: vi.fn(), isPending: false },
    } as never);

    setVoiceover();
    setSettings();
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

    renderContainer();

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock,
    });
  });

  it('uses smart filename when exporting audio', () => {
    setVoiceover({
      title: 'Launch Narration',
      status: 'ready',
      audioUrl: 'https://cdn.example.com/audio/voiceover.mp3?x=1',
      duration: 75,
      updatedAt: '2026-02-19T14:00:00.000Z',
    });

    renderContainer();

    getLastVoiceoverDetailProps<{
      onExportAudio?: () => void;
    }>()?.onExportAudio?.();

    expect(downloadFromUrlSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/audio/voiceover.mp3?x=1',
      'launch-narration-audio-20260219.mp3',
    );
  });

  it('uses smart filename when exporting script', () => {
    renderContainer();

    getLastVoiceoverDetailProps<{
      onExportScript?: () => void;
    }>()?.onExportScript?.();

    expect(downloadTextFileSpy).toHaveBeenCalledWith(
      expect.any(String),
      'test-voiceover-script-20260220.txt',
    );
  });

  it('does not register a standalone Cmd+S shortcut for voiceovers', () => {
    setSettings({ hasChanges: true });
    setActions({ hasChanges: true });

    renderContainer();

    expect(getShortcutConfig('s')).toBeUndefined();
  });

  it('maps Cmd+Enter to generate', () => {
    const handleGenerate = vi.fn();
    setActions({ hasText: true, isGenerating: false, handleGenerate });

    renderContainer();

    expect(getShortcutConfig('Enter')).toBeDefined();
    expect(getShortcutConfig('Enter')?.onTrigger).toBe(handleGenerate);
    expect(getShortcutConfig('Enter')?.enabled).toBe(true);
  });
});
