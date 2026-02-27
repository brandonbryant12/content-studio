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

// Stub document components to avoid deep dependency chains
vi.mock('@/features/documents/components', () => ({
  UploadDocumentDialog: () => null,
  AddFromUrlDialog: () => null,
  ResearchChatContainer: () => null,
  DocumentEntryMenu: () => null,
}));

function createProps(
  overrides: Partial<DashboardPageProps> = {},
): DashboardPageProps {
  return {
    counts: { documents: 0, podcasts: 0, voiceovers: 0, infographics: 0 },
    loading: {
      documents: false,
      podcasts: false,
      voiceovers: false,
      infographics: false,
    },
    recent: { documents: [], podcasts: [], voiceovers: [], infographics: [] },
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
    onboarding: {
      show: false,
      onDismiss: vi.fn(),
    },
    ...overrides,
  };
}

describe('DashboardPage onboarding integration', () => {
  it('shows onboarding guidance when show is true', () => {
    render(
      <DashboardPage
        {...createProps({ onboarding: { show: true, onDismiss: vi.fn() } })}
      />,
    );

    expect(screen.getByText('Welcome to Content Studio')).toBeInTheDocument();
  });

  it('hides onboarding guidance when show is false', () => {
    render(
      <DashboardPage
        {...createProps({ onboarding: { show: false, onDismiss: vi.fn() } })}
      />,
    );

    expect(
      screen.queryByText('Welcome to Content Studio'),
    ).not.toBeInTheDocument();
  });

  it('still renders stat cards alongside onboarding', () => {
    render(
      <DashboardPage
        {...createProps({ onboarding: { show: true, onDismiss: vi.fn() } })}
      />,
    );

    // Stat card values should be present (rendered as count "0")
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);

    // Onboarding should also be present
    expect(screen.getByText('Welcome to Content Studio')).toBeInTheDocument();
  });
});
