import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes } from 'react';
import { PodcastDetail } from '../components/podcast-detail';
import { WorkbenchLayout } from '../components/workbench/workbench-layout';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/shared/components/approval/approve-button', () => ({
  ApproveButton: () => <div>approve-button</div>,
}));

vi.mock('../components/workbench', () => ({
  WorkbenchLayout,
  ScriptPanel: () => <div>script-panel</div>,
  ConfigPanel: ({ section }: { section: string }) => (
    <div>{`config-${section}`}</div>
  ),
  GlobalActionBar: () => <div>action-bar</div>,
}));

function createPodcast(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pod_1',
    title: 'Quarterly Update',
    status: 'ready',
    format: 'voice_over',
    summary: null,
    errorMessage: null,
    duration: null,
    sources: [],
    approvedBy: null,
    ...overrides,
  } as never;
}

function createScriptEditor() {
  return {
    segments: [],
    hasChanges: false,
    isSaving: false,
    updateSegment: vi.fn(),
    removeSegment: vi.fn(),
    addSegment: vi.fn(),
    discardChanges: vi.fn(),
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

describe('PodcastDetail', () => {
  it('fans workbench navigation out into explicit option tabs', async () => {
    const user = userEvent.setup();

    render(
      <PodcastDetail
        podcast={createPodcast()}
        scriptEditor={createScriptEditor()}
        settings={createSettings()}
        sourceSelection={createSourceSelection()}
        displayAudio={null}
        workbenchState={{
          hasChanges: false,
          isGenerating: false,
          isPendingGeneration: false,
          isSaving: false,
          isDeleting: false,
        }}
        approvalState={{
          isApproved: false,
          isAdmin: false,
          isApprovalPending: false,
        }}
        onSave={vi.fn()}
        onGenerate={vi.fn()}
        onDelete={vi.fn()}
        onApprove={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: /Script/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Voice/i })).toBeInTheDocument();
    // Direction tab commented out from UI
    expect(
      screen.queryByRole('tab', { name: /Direction/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sources/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: /Duration/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: /Settings/i }),
    ).not.toBeInTheDocument();

    expect(screen.getByText('script-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Sources/i }));

    expect(screen.getByText('config-sources')).toBeInTheDocument();
    expect(screen.queryByText('script-panel')).not.toBeInTheDocument();
  });
});
