import { describe, expect, it, vi } from 'vitest';
import {
  QuickStartPanel,
  type QuickStartPanelProps,
} from '../components/quick-start-panel';
import { render, screen, within } from '@/test-utils';

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
  it('shows add-sources card and quick-create toolbar when no documents exist', () => {
    render(
      <QuickStartPanel
        {...createProps({
        })}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /add your first source/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /create your first content/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Source' })).toBeInTheDocument();
  });

  it('shows create-first-content card when sources exist but no generated content', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: { sources: 2, podcasts: 0, voiceovers: 0, infographics: 0 },
        })}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /create your first content/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /add your first source/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Try creating:')).not.toBeInTheDocument();
  });

  it('surfaces only missing content types in suggestion bar', () => {
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

  it('hides suggestion bar when all content types already exist', () => {
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
