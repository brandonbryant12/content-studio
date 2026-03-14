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
  it('shows source-acquisition actions when there are no sources', () => {
    render(<QuickStartPanel {...createProps()} />);

    expect(
      screen.getByRole('heading', { name: 'Add your first source' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Upload a file/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Import from URL/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Deep Research/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Create your first content' }),
    ).not.toBeInTheDocument();
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

  it('surfaces only missing content types in the suggestion bar', async () => {
    const user = userEvent.setup();
    const onCreateVoiceover = vi.fn();
    const onCreateInfographic = vi.fn();

    render(
      <QuickStartPanel
        {...createProps({
          counts: { sources: 3, podcasts: 1, voiceovers: 0, infographics: 0 },
          createActions: {
            onCreatePodcast: vi.fn(),
            isPodcastPending: false,
            onCreateVoiceover,
            isVoiceoverPending: false,
            onCreateInfographic,
            isInfographicPending: false,
          },
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

    await user.click(
      within(suggestionBar!).getByRole('button', { name: 'Voiceover' }),
    );
    await user.click(
      within(suggestionBar!).getByRole('button', { name: 'Infographic' }),
    );

    expect(onCreateVoiceover).toHaveBeenCalledTimes(1);
    expect(onCreateInfographic).toHaveBeenCalledTimes(1);
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
