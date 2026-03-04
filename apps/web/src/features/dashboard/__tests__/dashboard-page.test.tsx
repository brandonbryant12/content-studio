import { describe, it, expect, vi } from 'vitest';
import {
  DashboardPage,
  type DashboardPageProps,
} from '../components/dashboard-page';
import { render, screen } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
}));

// Stub TanStack Router
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

// Stub source components to avoid deep dependency chains
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
      onCreateFromUrl: vi.fn(),
      isCreateFromUrlPending: false,
    },
    ...overrides,
  };
}

describe('DashboardPage heading and value communication', () => {
  it('renders visible dashboard heading with value subtitle', () => {
    render(<DashboardPage {...createProps()} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(/Create AI-generated podcasts, voiceovers, and visuals/),
    ).toBeInTheDocument();
  });

  it('renders the workflow strip with all three steps', () => {
    render(<DashboardPage {...createProps()} />);

    expect(screen.getByText('Upload sources')).toBeInTheDocument();
    expect(screen.getByText('AI creates content')).toBeInTheDocument();
    expect(screen.getByText('Review & refine')).toBeInTheDocument();
  });
});

describe('DashboardPage quick-start panel', () => {
  it('shows add sources panel when no documents exist', () => {
    render(<DashboardPage {...createProps()} />);

    expect(screen.getByText('Add your first source')).toBeInTheDocument();
    expect(screen.getByText('Upload a file')).toBeInTheDocument();
    expect(screen.getByText('Import from URL')).toBeInTheDocument();
    expect(screen.getByText('AI deep research')).toBeInTheDocument();
  });

  it('shows create first content panel when documents exist but no generated content', () => {
    render(
      <DashboardPage
        {...createProps({
          counts: { sources: 3, podcasts: 0, voiceovers: 0, infographics: 0 },
        })}
      />,
    );

    expect(screen.getByText('Create your first content')).toBeInTheDocument();
    // "Create Podcast" appears in both the quick-start panel and recent section
    expect(
      screen.getAllByRole('button', { name: /Create Podcast/i }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole('button', { name: /Create Voiceover/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('shows suggestion bar for missing content types', () => {
    render(
      <DashboardPage
        {...createProps({
          counts: { sources: 3, podcasts: 2, voiceovers: 0, infographics: 0 },
        })}
      />,
    );

    expect(screen.getByText('Try creating:')).toBeInTheDocument();
  });

  it('shows quick create toolbar when all types have content', () => {
    render(
      <DashboardPage
        {...createProps({
          counts: { sources: 3, podcasts: 2, voiceovers: 1, infographics: 1 },
        })}
      />,
    );

    expect(screen.getByText('Quick create:')).toBeInTheDocument();
  });
});

describe('DashboardPage empty messages', () => {
  it('shows action-oriented empty messages in recent sections', () => {
    render(<DashboardPage {...createProps()} />);

    expect(
      screen.getByText('Create a podcast from your sources'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Record a voiceover with AI narration'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Generate visuals from your content'),
    ).toBeInTheDocument();
  });
});
