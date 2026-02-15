import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceoverDetailContainer } from '../components/voiceover-detail-container';
import { useApproveVoiceover } from '../hooks/use-approve-voiceover';
import { useVoiceover } from '../hooks/use-voiceover';
import { useVoiceoverActions } from '../hooks/use-voiceover-actions';
import { useVoiceoverSettings } from '../hooks/use-voiceover-settings';
import {
  useNavigationBlock,
  useSessionGuard,
  useIsAdmin,
} from '@/shared/hooks';
import { render } from '@/test-utils';

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
  VoiceoverDetail: () => <div data-testid="voiceover-detail" />,
}));

vi.mock('@/shared/hooks', () => ({
  useKeyboardShortcut: vi.fn(),
  useNavigationBlock: vi.fn(),
  useSessionGuard: vi.fn(),
  useIsAdmin: vi.fn(),
}));

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
      },
    } as never);

    vi.mocked(useVoiceoverSettings).mockReturnValue({
      text: 'Hello world',
      voice: 'Charon',
      setText: vi.fn(),
      setVoice: vi.fn(),
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
});
