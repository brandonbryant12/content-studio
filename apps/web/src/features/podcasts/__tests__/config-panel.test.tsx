import { describe, expect, it, vi } from 'vitest';
import { ConfigPanel } from '../components/workbench/config-panel';
import { render, screen } from '@/test-utils';

vi.mock('../components/workbench/generation-status', () => ({
  GenerationStatus: () => <div>generation-status</div>,
}));

vi.mock('../components/workbench/podcast-settings', () => ({
  PodcastSettings: ({ section }: { section: string }) => (
    <div>{`settings-${section}`}</div>
  ),
}));

vi.mock('../components/workbench/source-manager', () => ({
  SourceManager: () => <div>sources-panel</div>,
}));

vi.mock('../components/workbench/prompt-viewer', () => ({
  PromptViewerPanel: () => <div>prompt-viewer</div>,
}));

function createPodcast(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pod_1',
    status: 'ready',
    sources: [],
    generationContext: null,
    ...overrides,
  } as never;
}

function createSettings() {
  return {
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
  } as never;
}

function createSourceSelection() {
  return {
    sources: [],
    sourceIds: [],
    addSources: vi.fn(),
    removeSource: vi.fn(),
    discardChanges: vi.fn(),
    hasChanges: false,
  } as never;
}

describe('ConfigPanel', () => {
  it('renders the requested settings section', () => {
    render(
      <ConfigPanel
        podcast={createPodcast()}
        section="voice"
        isGenerating={false}
        isPendingGeneration={false}
        settings={createSettings()}
        sourceSelection={createSourceSelection()}
      />,
    );

    expect(screen.getByText('Voice Mixer')).toBeInTheDocument();
    expect(screen.getByText('settings-voice')).toBeInTheDocument();
    expect(screen.queryByText('sources-panel')).not.toBeInTheDocument();
  });

  it('renders the sources section when requested', () => {
    render(
      <ConfigPanel
        podcast={createPodcast({
          sources: [{ id: 'src_1', title: 'Source One', status: 'ready' }],
        })}
        section="sources"
        isGenerating={false}
        isPendingGeneration={false}
        settings={createSettings()}
        sourceSelection={createSourceSelection()}
      />,
    );

    expect(screen.getByText('sources-panel')).toBeInTheDocument();
  });
});
