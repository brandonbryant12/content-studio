import { describe, expect, it, vi } from 'vitest';
import {
  QuickStartPanel,
  type QuickStartPanelProps,
} from '../components/quick-start-panel';
import { render, screen, userEvent, within } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
  isDeepResearchEnabled: true,
}));

function createProps(
  overrides: Partial<QuickStartPanelProps> = {},
): QuickStartPanelProps {
  return {
    counts: { sources: 0, podcasts: 0, voiceovers: 0, infographics: 0 },
    createActions: {
      onCreatePodcast: vi.fn(),
      isPodcastPending: false,
      onCreateVoiceover: vi.fn(),
      isVoiceoverPending: false,
      onCreateInfographic: vi.fn(),
      isInfographicPending: false,
    },
    documentDialogs: {
      onUploadOpenChange: vi.fn(),
      onUrlDialogOpenChange: vi.fn(),
      onResearchDialogOpenChange: vi.fn(),
      onOpenResearchWithPodcast: vi.fn(),
    },
    ...overrides,
  };
}

describe('QuickStartPanel', () => {
  it('shows source-acquisition actions when there are no sources', async () => {
    const user = userEvent.setup();
    const onUploadOpenChange = vi.fn();
    const onUrlDialogOpenChange = vi.fn();
    const onResearchDialogOpenChange = vi.fn();

    render(
      <QuickStartPanel
        {...createProps({
          documentDialogs: {
            onUploadOpenChange,
            onUrlDialogOpenChange,
            onResearchDialogOpenChange,
            onOpenResearchWithPodcast: vi.fn(),
          },
        })}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /^Upload a file/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /^Import from URL/i }),
    );
    await user.click(screen.getByRole('button', { name: /^Deep Research/i }));

    expect(onUploadOpenChange).toHaveBeenCalledWith(true);
    expect(onUrlDialogOpenChange).toHaveBeenCalledWith(true);
    expect(onResearchDialogOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows primary create actions when sources exist and no generated outputs exist', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: { sources: 2, podcasts: 0, voiceovers: 0, infographics: 0 },
        })}
      />,
    );

    expect(
      screen.getAllByRole('button', { name: 'Podcast' }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Voiceover' }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Infographic' }).length,
    ).toBeGreaterThan(0);
  });

  it('surfaces only missing content types in the suggestion bar', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: { sources: 3, podcasts: 1, voiceovers: 0, infographics: 0 },
        })}
      />,
    );

    const suggestionBar = screen.getByText('Try creating:').closest('div');
    expect(suggestionBar).not.toBeNull();

    expect(
      within(suggestionBar!).queryByRole('button', { name: 'Podcast' }),
    ).not.toBeInTheDocument();
    expect(
      within(suggestionBar!).getByRole('button', { name: 'Voiceover' }),
    ).toBeInTheDocument();
    expect(
      within(suggestionBar!).getByRole('button', { name: 'Infographic' }),
    ).toBeInTheDocument();
  });

  it('hides the suggestion bar when all content types already exist', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: { sources: 3, podcasts: 1, voiceovers: 1, infographics: 1 },
        })}
      />,
    );

    expect(screen.queryByText('Try creating:')).not.toBeInTheDocument();
  });
});
