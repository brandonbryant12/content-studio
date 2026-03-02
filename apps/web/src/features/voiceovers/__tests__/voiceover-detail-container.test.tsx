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
  useNavigationBlock: vi.fn(),
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

function getLastVoiceoverDetailProps<T>(): T | undefined {
  const lastCall =
    voiceoverDetailSpy.mock.calls[voiceoverDetailSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
}

describe('VoiceoverDetailContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSessionGuard).mockReturnValue({
      user: { id: 'user-1' },
    } as never);
    vi.mocked(useIsAdmin).mockReturnValue(false);

    vi.mocked(useVoiceover).mockReturnValue({
      data: {
        id: 'voiceover-1',
        title: 'Test Voiceover',
        status: 'drafting',
        approvedBy: null,
        audioUrl: null,
        duration: null,
        updatedAt: '2026-02-20T14:00:00.000Z',
      },
    } as never);

    vi.mocked(useVoiceoverSettings).mockReturnValue({
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
    } as never);

    vi.mocked(useApproveVoiceover).mockReturnValue({
      approve: { mutate: vi.fn(), isPending: false },
      revoke: { mutate: vi.fn(), isPending: false },
    } as never);
  });

  it('blocks navigation when there are unsaved changes and no generation', () => {
    vi.mocked(useVoiceoverActions).mockReturnValue(
      createMockActions({ hasChanges: true, isGenerating: false }) as never,
    );

    render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: true,
    });
  });

  it('does not block navigation while generation is running', () => {
    vi.mocked(useVoiceoverActions).mockReturnValue(
      createMockActions({ hasChanges: true, isGenerating: true }) as never,
    );

    render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: false,
    });
  });

  it('uses smart filename when exporting audio', () => {
    vi.mocked(useVoiceover).mockReturnValue({
      data: {
        id: 'voiceover-1',
        title: 'Launch Narration',
        status: 'ready',
        approvedBy: null,
        audioUrl: 'https://cdn.example.com/audio/voiceover.mp3?x=1',
        duration: 75,
        updatedAt: '2026-02-19T14:00:00.000Z',
      },
    } as never);
    vi.mocked(useVoiceoverActions).mockReturnValue(
      createMockActions() as never,
    );

    render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

    const props = getLastVoiceoverDetailProps<{ onExportAudio?: () => void }>();
    props?.onExportAudio?.();

    expect(downloadFromUrlSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/audio/voiceover.mp3?x=1',
      'launch-narration-audio-20260219.mp3',
    );
  });

  it('uses smart filename when exporting script', () => {
    vi.mocked(useVoiceoverActions).mockReturnValue(
      createMockActions() as never,
    );

    render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

    const props = getLastVoiceoverDetailProps<{
      onExportScript?: () => void;
    }>();
    props?.onExportScript?.();

    expect(downloadTextFileSpy).toHaveBeenCalledWith(
      expect.any(String),
      'test-voiceover-script-20260220.txt',
    );
  });

  it('maps Cmd+S to save (not generate)', () => {
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useVoiceoverSettings).mockReturnValue({
      title: 'Test Voiceover',
      text: 'Hello world',
      voice: 'Charon',
      setTitle: vi.fn(),
      setText: vi.fn(),
      setVoice: vi.fn(),
      hasTitleChanges: false,
      hasChanges: true,
      isSaving: false,
      saveSettings,
      discardChanges: vi.fn(),
    } as never);

    const handleGenerate = vi.fn();
    vi.mocked(useVoiceoverActions).mockReturnValue(
      createMockActions({ hasChanges: true, handleGenerate }) as never,
    );

    render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

    // Find the Cmd+S shortcut call
    const shortcutCalls = vi.mocked(useKeyboardShortcut).mock.calls;
    const cmdSCall = shortcutCalls.find(
      ([opts]) => opts.key === 's' && opts.cmdOrCtrl === true,
    );

    expect(cmdSCall).toBeDefined();
    // Cmd+S should NOT call handleGenerate
    expect(cmdSCall![0].onTrigger).not.toBe(handleGenerate);
  });

  it('maps Cmd+Enter to generate', () => {
    const handleGenerate = vi.fn();
    vi.mocked(useVoiceoverActions).mockReturnValue(
      createMockActions({
        hasText: true,
        isGenerating: false,
        handleGenerate,
      }) as never,
    );

    render(<VoiceoverDetailContainer voiceoverId="voiceover-1" />);

    const shortcutCalls = vi.mocked(useKeyboardShortcut).mock.calls;
    const cmdEnterCall = shortcutCalls.find(
      ([opts]) => opts.key === 'Enter' && opts.cmdOrCtrl === true,
    );

    expect(cmdEnterCall).toBeDefined();
    expect(cmdEnterCall![0].onTrigger).toBe(handleGenerate);
    expect(cmdEnterCall![0].enabled).toBe(true);
  });
});
