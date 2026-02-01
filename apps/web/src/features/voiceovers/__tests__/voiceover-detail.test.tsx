// features/voiceovers/__tests__/voiceover-detail.test.tsx

import { describe, it, expect, vi } from 'vitest';
import type { Collaborator } from '../hooks/use-collaborators';
import type { UseVoiceoverSettingsReturn } from '../hooks/use-voiceover-settings';
import type { RouterOutput } from '@repo/api/client';
import {
  VoiceoverDetail,
  type VoiceoverDetailProps,
} from '../components/voiceover-detail';
import { VoiceoverStatus } from '../lib/status';
import { render, screen, fireEvent } from '@/test-utils';

type Voiceover = RouterOutput['voiceovers']['get'];

// Mock the workbench components to simplify testing
vi.mock('../components/workbench', () => ({
  WorkbenchLayout: ({
    children,
    actionBar,
  }: {
    children: React.ReactNode;
    actionBar: React.ReactNode;
  }) => (
    <div data-testid="workbench-layout">
      <div data-testid="action-bar-container">{actionBar}</div>
      <div data-testid="workbench-content">{children}</div>
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
}));

// Mock voiceover data
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
    ownerHasApproved: false,
    ...overrides,
  } as Voiceover;
}

// Mock settings return
function createMockSettings(
  overrides: Partial<UseVoiceoverSettingsReturn> = {},
): UseVoiceoverSettingsReturn {
  return {
    text: 'Test voiceover text',
    voice: 'Charon',
    setText: vi.fn(),
    setVoice: vi.fn(),
    hasChanges: false,
    isSaving: false,
    saveSettings: vi.fn().mockResolvedValue(undefined),
    discardChanges: vi.fn(),
    ...overrides,
  };
}

function createMockOwner(overrides = {}) {
  return {
    id: 'user-1',
    name: 'Test User',
    image: null,
    hasApproved: false,
    ...overrides,
  };
}

function createDefaultProps(
  overrides: Partial<VoiceoverDetailProps> = {},
): VoiceoverDetailProps {
  return {
    voiceover: createMockVoiceover(),
    settings: createMockSettings(),
    displayAudio: null,
    hasChanges: false,
    hasText: true,
    isGenerating: false,
    isSaving: false,
    isDeleting: false,
    onGenerate: vi.fn(),
    onDelete: vi.fn(),
    currentUserId: 'user-1',
    owner: createMockOwner(),
    collaborators: [] as readonly Collaborator[],
    currentUserHasApproved: false,
    onManageCollaborators: vi.fn(),
    onApprove: vi.fn(),
    onRevoke: vi.fn(),
    isApprovalPending: false,
    ...overrides,
  };
}

describe('VoiceoverDetail', () => {
  it('renders text editor and voice selector', () => {
    render(<VoiceoverDetail {...createDefaultProps()} />);

    expect(screen.getByTestId('text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('voice-selector')).toBeInTheDocument();
  });

  it('passes text to text editor', () => {
    const settings = createMockSettings({ text: 'Custom voiceover content' });
    render(<VoiceoverDetail {...createDefaultProps({ settings })} />);

    const textEditor = screen.getByTestId('text-editor');
    expect(textEditor).toHaveValue('Custom voiceover content');
  });

  it('passes voice to voice selector', () => {
    const settings = createMockSettings({ voice: 'Aoede' });
    render(<VoiceoverDetail {...createDefaultProps({ settings })} />);

    const voiceSelector = screen.getByTestId('voice-selector');
    expect(voiceSelector).toHaveValue('Aoede');
  });

  it('calls setText when text editor changes', () => {
    const setText = vi.fn();
    const settings = createMockSettings({ setText });
    render(<VoiceoverDetail {...createDefaultProps({ settings })} />);

    const textEditor = screen.getByTestId('text-editor');
    fireEvent.change(textEditor, { target: { value: 'Updated text' } });

    expect(setText).toHaveBeenCalledWith('Updated text');
  });

  it('calls setVoice when voice selector changes', () => {
    const setVoice = vi.fn();
    const settings = createMockSettings({ setVoice });
    render(<VoiceoverDetail {...createDefaultProps({ settings })} />);

    const voiceSelector = screen.getByTestId('voice-selector');
    fireEvent.change(voiceSelector, { target: { value: 'Aoede' } });

    expect(setVoice).toHaveBeenCalledWith('Aoede');
  });

  it('shows audio player when audio exists', () => {
    const displayAudio = {
      url: 'https://example.com/audio.mp3',
      duration: 120,
    };
    render(<VoiceoverDetail {...createDefaultProps({ displayAudio })} />);

    expect(screen.getByText('Audio Preview')).toBeInTheDocument();
    // Use querySelector to find audio element since role might not work directly
    const audioElement = document.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute(
      'src',
      'https://example.com/audio.mp3',
    );
  });

  it('does not show audio player when no audio', () => {
    render(<VoiceoverDetail {...createDefaultProps({ displayAudio: null })} />);

    expect(screen.queryByText('Audio Preview')).not.toBeInTheDocument();
    expect(document.querySelector('audio')).not.toBeInTheDocument();
  });

  it('shows correct status in action bar', () => {
    const voiceover = createMockVoiceover({ status: VoiceoverStatus.READY });
    render(<VoiceoverDetail {...createDefaultProps({ voiceover })} />);

    const actionBar = screen.getByTestId('action-bar');
    expect(actionBar).toHaveAttribute('data-status', VoiceoverStatus.READY);
  });

  it('disables inputs during generation', () => {
    render(<VoiceoverDetail {...createDefaultProps({ isGenerating: true })} />);

    const textEditor = screen.getByTestId('text-editor');
    const voiceSelector = screen.getByTestId('voice-selector');

    expect(textEditor).toBeDisabled();
    expect(voiceSelector).toBeDisabled();
  });

  it('enables inputs when not generating', () => {
    render(
      <VoiceoverDetail {...createDefaultProps({ isGenerating: false })} />,
    );

    const textEditor = screen.getByTestId('text-editor');
    const voiceSelector = screen.getByTestId('voice-selector');

    expect(textEditor).not.toBeDisabled();
    expect(voiceSelector).not.toBeDisabled();
  });

  it('passes isGenerating to action bar', () => {
    render(<VoiceoverDetail {...createDefaultProps({ isGenerating: true })} />);

    const actionBar = screen.getByTestId('action-bar');
    expect(actionBar).toHaveAttribute('data-generating', 'true');
  });

  it('renders workbench layout with action bar', () => {
    render(<VoiceoverDetail {...createDefaultProps()} />);

    expect(screen.getByTestId('workbench-layout')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar-container')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });
});
