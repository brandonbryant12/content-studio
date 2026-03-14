import { describe, expect, it, vi } from 'vitest';
import {
  DashboardPage,
  type DashboardPageProps,
} from '../components/dashboard-page';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
  isDeepResearchEnabled: true,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/sources/components', () => ({
  UploadSourceDialog: () => null,
  AddFromUrlDialog: () => null,
  ResearchChatContainer: () => null,
  SourceEntryMenu: () => null,
}));

function createProps(
  overrides: Partial<DashboardPageProps> = {},
): DashboardPageProps {
  return {
    counts: { sources: 0, podcasts: 0, voiceovers: 0, infographics: 0 },
    loading: {
      sources: false,
      podcasts: false,
      voiceovers: false,
      infographics: false,
    },
    recent: { sources: [], podcasts: [], voiceovers: [], infographics: [] },
    createActions: {
      onCreatePodcast: vi.fn(),
      isPodcastPending: false,
      onCreateVoiceover: vi.fn(),
      isVoiceoverPending: false,
      onCreateInfographic: vi.fn(),
      isInfographicPending: false,
    },
    documentDialogs: {
      uploadOpen: false,
      onUploadOpenChange: vi.fn(),
      urlDialogOpen: false,
      onUrlDialogOpenChange: vi.fn(),
      researchDialogOpen: false,
      onResearchDialogOpenChange: vi.fn(),
      researchAutoGenPodcast: false,
      onOpenResearchWithPodcast: vi.fn(),
      onCreateFromUrl: vi.fn(),
      isCreateFromUrlPending: false,
    },
    ...overrides,
  };
}

describe('DashboardPage', () => {
  it('exposes research entrypoint without duplicate quick toolbar shortcut', () => {
    render(<DashboardPage {...createProps()} />);

    expect(screen.getByRole('button', { name: /try it now/i })).toBeInTheDocument();
    expect(screen.queryByText(/Research\s*→\s*Podcast/i)).not.toBeInTheDocument();
  });

  it('wires quick-start source upload action through document dialog callback', async () => {
    const user = userEvent.setup();
    const onUploadOpenChange = vi.fn();

    render(
      <DashboardPage
        {...createProps({
          documentDialogs: {
            ...createProps().documentDialogs,
            onUploadOpenChange,
          },
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /upload a file/i }));
    expect(onUploadOpenChange).toHaveBeenCalledWith(true);
  });

  it('wires create actions when documents exist but generated content does not', async () => {
    const user = userEvent.setup();
    const onCreatePodcast = vi.fn();
    const onCreateVoiceover = vi.fn();
    const onCreateInfographic = vi.fn();

    render(
      <DashboardPage
        {...createProps({
          counts: { sources: 3, podcasts: 0, voiceovers: 0, infographics: 0 },
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

    await user.click(screen.getAllByRole('button', { name: /create podcast/i })[0]);
    await user.click(
      screen.getAllByRole('button', { name: /create voiceover/i })[0],
    );
    await user.click(
      screen.getAllByRole('button', { name: /create infographic/i })[0],
    );

    expect(onCreatePodcast).toHaveBeenCalled();
    expect(onCreateVoiceover).toHaveBeenCalled();
    expect(onCreateInfographic).toHaveBeenCalled();
  });
});
