import { describe, it, expect, vi } from 'vitest';
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
  it('shows add sources card and quick create toolbar when no documents exist', () => {
    render(<QuickStartPanel {...createProps()} />);

    expect(screen.getByText('Add your first source')).toBeInTheDocument();
    expect(screen.getByText('Upload a file')).toBeInTheDocument();
    expect(screen.getByText('Import from URL')).toBeInTheDocument();
    expect(screen.getByText('Deep Research')).toBeInTheDocument();
    expect(screen.getByText('Quick create:')).toBeInTheDocument();
  });

  it('opens upload dialog when clicking upload action', () => {
    const onUploadOpenChange = vi.fn();
    render(
      <QuickStartPanel
        {...createProps({
          documentDialogs: {
            onUploadOpenChange,
            onUrlDialogOpenChange: vi.fn(),
            onResearchDialogOpenChange: vi.fn(),
            onOpenResearchWithPodcast: vi.fn(),
          },
        })}
      />,
    );

    screen.getByText('Upload a file').click();
    expect(onUploadOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows create first content guidance and quick create toolbar when documents exist but no generated content', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: {
            sources: 5,
            podcasts: 0,
            voiceovers: 0,
            infographics: 0,
          },
        })}
      />,
    );

    expect(screen.getByText('Create your first content')).toBeInTheDocument();
    expect(screen.getByText('Quick create:')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create Podcast/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create Voiceover/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create Infographic/i }),
    ).toBeInTheDocument();
  });

  it('shows suggestion bar and quick create toolbar when some content types are missing', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: {
            sources: 3,
            podcasts: 2,
            voiceovers: 0,
            infographics: 0,
          },
        })}
      />,
    );

    const suggestionBar = screen.getByText('Try creating:').parentElement;

    expect(screen.getByText('Try creating:')).toBeInTheDocument();
    expect(screen.getByText('Quick create:')).toBeInTheDocument();
    expect(suggestionBar).not.toBeNull();
    expect(
      within(suggestionBar!).getByRole('button', { name: /Voiceover/i }),
    ).toBeInTheDocument();
    expect(
      within(suggestionBar!).getByRole('button', { name: /Infographic/i }),
    ).toBeInTheDocument();
  });

  it('shows quick create toolbar when all content types exist', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: {
            sources: 3,
            podcasts: 2,
            voiceovers: 1,
            infographics: 1,
          },
        })}
      />,
    );

    expect(screen.getByText('Quick create:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Infographic/i })).toBeEnabled();
  });

  it('does not render the research to podcast toolbar shortcut', () => {
    render(
      <QuickStartPanel
        {...createProps({
          counts: {
            sources: 3,
            podcasts: 2,
            voiceovers: 1,
            infographics: 1,
          },
        })}
      />,
    );

    expect(screen.queryByText(/Research.+Podcast/i)).not.toBeInTheDocument();
  });

  it('triggers infographic creation from suggestion and toolbar actions', () => {
    const onCreateInfographic = vi.fn();
    const { rerender } = render(
      <QuickStartPanel
        {...createProps({
          counts: {
            sources: 3,
            podcasts: 2,
            voiceovers: 0,
            infographics: 0,
          },
          createActions: {
            onCreatePodcast: vi.fn(),
            isPodcastPending: false,
            onCreateVoiceover: vi.fn(),
            isVoiceoverPending: false,
            onCreateInfographic,
            isInfographicPending: false,
          },
        })}
      />,
    );

    const suggestionBar = screen.getByText('Try creating:').parentElement;
    expect(suggestionBar).not.toBeNull();

    within(suggestionBar!)
      .getByRole('button', { name: /Infographic/i })
      .click();
    expect(onCreateInfographic).toHaveBeenCalledTimes(1);

    rerender(
      <QuickStartPanel
        {...createProps({
          counts: {
            sources: 3,
            podcasts: 2,
            voiceovers: 1,
            infographics: 1,
          },
          createActions: {
            onCreatePodcast: vi.fn(),
            isPodcastPending: false,
            onCreateVoiceover: vi.fn(),
            isVoiceoverPending: false,
            onCreateInfographic,
            isInfographicPending: false,
          },
        })}
      />,
    );

    const quickCreateToolbar = screen.getByText('Quick create:').parentElement;
    expect(quickCreateToolbar).not.toBeNull();

    within(quickCreateToolbar!)
      .getByRole('button', { name: /Infographic/i })
      .click();
    expect(onCreateInfographic).toHaveBeenCalledTimes(2);
  });
});
