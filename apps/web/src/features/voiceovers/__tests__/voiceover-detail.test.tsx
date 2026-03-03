import { describe, it, expect, vi } from 'vitest';
import type { UseVoiceoverSettingsReturn } from '../hooks/use-voiceover-settings';
import type { RouterOutput } from '@repo/api/client';
import type { ReactNode } from 'react';
import {
  VoiceoverDetail,
  type VoiceoverDetailProps,
} from '../components/voiceover-detail';
import { VoiceoverStatus } from '../lib/status';
import { render, screen, fireEvent } from '@/test-utils';

type Voiceover = RouterOutput['voiceovers']['get'];

vi.mock('../components/workbench', () => ({
  WorkbenchLayout: ({
    children,
    actionBar,
    rightPanel,
  }: {
    children: ReactNode;
    actionBar: ReactNode;
    rightPanel?: ReactNode;
  }) => (
    <div data-testid="workbench-layout">
      <div data-testid="action-bar-container">{actionBar}</div>
      <div data-testid="workbench-content">{children}</div>
      <div data-testid="assistant-panel-container">{rightPanel}</div>
    </div>
  ),
  TextEditor: ({
    text,
    onChange,
    disabled,
    placeholder,
  }: {
    text: string;
    onChange: (text: string) => void;
    disabled?: boolean;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="text-editor"
      value={text}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label="Voiceover text"
    />
  ),
  VoiceSelector: ({
    voice,
    onChange,
    disabled,
  }: {
    voice: string;
    onChange: (voice: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="voice-selector"
      value={voice}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Voice"
    >
      <option value="Charon">Charon</option>
      <option value="Aoede">Aoede</option>
    </select>
  ),
  AudioStage: ({ src, duration }: { src: string; duration: number }) => (
    <div data-testid="audio-stage">
      <p>Audio Preview</p>
      <audio src={src} data-duration={duration} />
    </div>
  ),
  ActionBar: ({
    status,
    isGenerating,
  }: {
    status: string;
    isGenerating: boolean;
  }) => (
    <div
      data-testid="action-bar"
      data-status={status}
      data-generating={isGenerating}
    >
      Action Bar
    </div>
  ),
  QuickStartGuide: ({
    onStartWriting,
    onDismiss,
  }: {
    onStartWriting: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid="quick-start-guide">
      <button type="button" onClick={onStartWriting}>
        Start Writing
      </button>
      <button type="button" onClick={onDismiss}>
        Skip this guide
      </button>
    </div>
  ),
}));

function createMockVoiceover(overrides: Partial<Voiceover> = {}): Voiceover {
  return {
    id: 'voiceover-1',
    title: 'Test Voiceover',
    text: 'This is a test voiceover text.',
    voice: 'Charon',
    voiceName: 'Charon',
    status: VoiceoverStatus.DRAFTING,
    audioUrl: null,
    duration: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    approvedBy: null,
    approvedAt: null,
    ...overrides,
  } as Voiceover;
}

function createMockSettings(
  overrides: Partial<UseVoiceoverSettingsReturn> = {},
): UseVoiceoverSettingsReturn {
  return {
    title: 'Test Voiceover',
    text: 'Test voiceover text',
    voice: 'Charon',
    setTitle: vi.fn(),
    setText: vi.fn(),
    setVoice: vi.fn(),
    hasTitleChanges: false,
    hasChanges: false,
    isSaving: false,
    saveSettings: vi.fn().mockResolvedValue(undefined),
    discardChanges: vi.fn(),
    ...overrides,
  };
}

function createDefaultProps(
  overrides: Omit<
    Partial<VoiceoverDetailProps>,
    'workbenchState' | 'approvalState'
  > & {
    workbenchState?: Partial<VoiceoverDetailProps['workbenchState']>;
    approvalState?: Partial<VoiceoverDetailProps['approvalState']>;
  } = {},
): VoiceoverDetailProps {
  const {
    workbenchState: workbenchStateOverride,
    approvalState: approvalStateOverride,
    ...restOverrides
  } = overrides;

  return {
    voiceover: createMockVoiceover(),
    settings: createMockSettings(),
    displayAudio: null,
    workbenchState: {
      hasChanges: false,
      hasText: true,
      isGenerating: false,
      isSaving: false,
      isDeleting: false,
      ...workbenchStateOverride,
    },
    approvalState: {
      isApproved: false,
      isAdmin: false,
      isApprovalPending: false,
      ...approvalStateOverride,
    },
    onSave: vi.fn(),
    onGenerate: vi.fn(),
    onDelete: vi.fn(),
    onApprove: vi.fn(),
    onRevoke: vi.fn(),
    ...restOverrides,
  };
}

const renderVoiceoverDetail = (
  overrides: Parameters<typeof createDefaultProps>[0] = {},
) => render(<VoiceoverDetail {...createDefaultProps(overrides)} />);

const renderNewVoiceover = (
  overrides: Parameters<typeof createDefaultProps>[0] = {},
) =>
  renderVoiceoverDetail({
    voiceover: createMockVoiceover({
      text: '',
      audioUrl: null,
      status: VoiceoverStatus.DRAFTING,
    }),
    settings: createMockSettings({ text: '' }),
    ...overrides,
  });

describe('VoiceoverDetail', () => {
  it('renders workbench layout with editor controls and action bar', () => {
    renderVoiceoverDetail();

    expect(screen.getByTestId('workbench-layout')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar-container')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    expect(screen.getByTestId('text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('voice-selector')).toBeInTheDocument();
  });

  it('passes settings values to editor controls', () => {
    const settings = createMockSettings({
      text: 'Custom voiceover content',
      voice: 'Aoede',
    });
    renderVoiceoverDetail({ settings });

    expect(screen.getByTestId('text-editor')).toHaveValue(
      'Custom voiceover content',
    );
    expect(screen.getByTestId('voice-selector')).toHaveValue('Aoede');
  });

  it('calls settings setters when editor controls change', () => {
    const setText = vi.fn();
    const setVoice = vi.fn();
    const settings = createMockSettings({ setText, setVoice });
    renderVoiceoverDetail({ settings });

    fireEvent.change(screen.getByTestId('text-editor'), {
      target: { value: 'Updated text' },
    });
    fireEvent.change(screen.getByTestId('voice-selector'), {
      target: { value: 'Aoede' },
    });

    expect(setText).toHaveBeenCalledWith('Updated text');
    expect(setVoice).toHaveBeenCalledWith('Aoede');
  });

  it('passes status to action bar', () => {
    renderVoiceoverDetail({
      voiceover: createMockVoiceover({ status: VoiceoverStatus.READY }),
    });

    expect(screen.getByTestId('action-bar')).toHaveAttribute(
      'data-status',
      VoiceoverStatus.READY,
    );
  });

  it.each([
    { isGenerating: true, expectedDisabled: true, expectedAttribute: 'true' },
    {
      isGenerating: false,
      expectedDisabled: false,
      expectedAttribute: 'false',
    },
  ])(
    'updates input disabled state when isGenerating=$isGenerating',
    ({ isGenerating, expectedDisabled, expectedAttribute }) => {
      renderVoiceoverDetail({ workbenchState: { isGenerating } });

      const textEditor = screen.getByTestId('text-editor');
      const voiceSelector = screen.getByTestId('voice-selector');
      const actionBar = screen.getByTestId('action-bar');

      expect(textEditor).toHaveProperty('disabled', expectedDisabled);
      expect(voiceSelector).toHaveProperty('disabled', expectedDisabled);
      expect(actionBar).toHaveAttribute('data-generating', expectedAttribute);
    },
  );

  it.each([
    {
      name: 'shows audio player when audio exists',
      displayAudio: { url: 'https://example.com/audio.mp3', duration: 120 },
      expectsAudio: true,
    },
    {
      name: 'hides audio player when audio is missing',
      displayAudio: null,
      expectsAudio: false,
    },
  ])('$name', ({ displayAudio, expectsAudio }) => {
    renderVoiceoverDetail({ displayAudio });

    const audioStage = screen.queryByTestId('audio-stage');
    if (expectsAudio) {
      expect(audioStage).toBeInTheDocument();
      expect(audioStage?.querySelector('audio')).toHaveAttribute(
        'src',
        displayAudio?.url,
      );
    } else {
      expect(audioStage).not.toBeInTheDocument();
    }
  });

  it('renders assistant panel when provided', () => {
    renderVoiceoverDetail({
      assistantPanel: <div>Writing Assistant Panel</div>,
    });

    expect(screen.getByText('Writing Assistant Panel')).toBeInTheDocument();
  });

  describe('Quick Start Guide', () => {
    it('shows quick start for drafting voiceovers with no text or audio', () => {
      renderNewVoiceover();

      expect(screen.getByTestId('quick-start-guide')).toBeInTheDocument();
      expect(screen.queryByTestId('text-editor')).not.toBeInTheDocument();
    });

    it.each([
      {
        name: 'voiceover already has text',
        overrides: {
          voiceover: createMockVoiceover({
            text: 'Some script',
            audioUrl: null,
            status: VoiceoverStatus.DRAFTING,
          }),
          settings: createMockSettings({ text: 'Some script' }),
        },
      },
      {
        name: 'voiceover is already ready',
        overrides: {
          voiceover: createMockVoiceover({
            text: '',
            audioUrl: null,
            status: VoiceoverStatus.READY,
          }),
        },
      },
      {
        name: 'settings text is non-empty',
        overrides: {
          settings: createMockSettings({ text: 'typed something' }),
        },
      },
    ])('shows text editor when $name', ({ overrides }) => {
      renderNewVoiceover(overrides);

      expect(screen.getByTestId('text-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-start-guide')).not.toBeInTheDocument();
    });

    it.each(['Skip this guide', 'Start Writing'])(
      'dismisses quick start when clicking "%s"',
      (buttonLabel) => {
        renderNewVoiceover();

        fireEvent.click(screen.getByText(buttonLabel));

        expect(
          screen.queryByTestId('quick-start-guide'),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId('text-editor')).toBeInTheDocument();
      },
    );
  });
});
