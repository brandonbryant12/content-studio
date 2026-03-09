import { describe, it, expect, vi } from 'vitest';
import {
  QuickStartPanel,
  type QuickStartPanelProps,
} from '../components/quick-start-panel';
import { render, screen } from '@/test-utils';

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
    },
    documentDialogs: {
      onUploadOpenChange: vi.fn(),
      onUrlDialogOpenChange: vi.fn(),
      onResearchDialogOpenChange: vi.fn(),
    },
    ...overrides,
  };
}

describe('QuickStartPanel', () => {
  it('shows add sources card when no documents exist', () => {
    render(<QuickStartPanel {...createProps()} />);

    expect(screen.getByText('Add your first source')).toBeInTheDocument();
    expect(screen.getByText('Upload a file')).toBeInTheDocument();
    expect(screen.getByText('Import from URL')).toBeInTheDocument();
    expect(screen.getByText('AI deep research')).toBeInTheDocument();
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
          },
        })}
      />,
    );

    screen.getByText('Upload a file').click();
    expect(onUploadOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows create first content when documents exist but no generated content', () => {
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
    expect(
      screen.getByRole('button', { name: /Create Podcast/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create Voiceover/i }),
    ).toBeInTheDocument();
  });

  it('shows suggestion bar when some content types are missing', () => {
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

    expect(screen.getByText('Try creating:')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Voiceover/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Infographic/i }),
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
  });
});
