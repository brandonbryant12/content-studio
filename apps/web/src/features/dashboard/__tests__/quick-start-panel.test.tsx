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
  it('opens source actions when no documents exist', async () => {
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

    await user.click(screen.getByRole('button', { name: /upload a file/i }));
    await user.click(screen.getByRole('button', { name: /import from url/i }));
    await user.click(screen.getByRole('button', { name: /deep research/i }));
    await user.click(screen.getByRole('button', { name: 'Source' }));

    expect(onUploadOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onUploadOpenChange).toHaveBeenNthCalledWith(2, true);
    expect(onUrlDialogOpenChange).toHaveBeenCalledWith(true);
    expect(onResearchDialogOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows create-first-content actions when sources exist but no generated content', async () => {
    const user = userEvent.setup();
    const onCreatePodcast = vi.fn();
    const onCreateVoiceover = vi.fn();
    const onCreateInfographic = vi.fn();

    render(
      <QuickStartPanel
        {...createProps({
          counts: { sources: 2, podcasts: 0, voiceovers: 0, infographics: 0 },
          createActions: {
            onCreatePodcast,
            isPodcastPending: false,
            onCreateVoiceover,
            isVoiceoverPending: false,
            onCreateInfographic,
            isInfographicPending: false,
          },
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: /upload a file/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create podcast/i }));
    await user.click(screen.getByRole('button', { name: /create voiceover/i }));
    await user.click(screen.getByRole('button', { name: /create infographic/i }));

    expect(onCreatePodcast).toHaveBeenCalledOnce();
    expect(onCreateVoiceover).toHaveBeenCalledOnce();
    expect(onCreateInfographic).toHaveBeenCalledOnce();
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
