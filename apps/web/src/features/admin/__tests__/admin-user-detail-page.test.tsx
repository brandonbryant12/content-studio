import { describe, expect, it, vi } from 'vitest';
import type { ReactNode, ComponentProps } from 'react';
import { AdminUserDetailPage } from '../components/admin-user-detail-page';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    [key: string]: unknown;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    );

    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const createProps = (
  overrides: Partial<ComponentProps<typeof AdminUserDetailPage>> = {},
) => {
  const sourceId = 'src_test_admin_detail' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['recentEntities']['sources'][number]['id'];
  const podcastId = 'pod_test_admin_detail' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['recentEntities']['podcasts'][number]['id'];
  const voiceoverId = 'vo_test_admin_detail' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['recentEntities']['voiceovers'][number]['id'];
  const personaId = 'per_test_admin_detail' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['recentEntities']['personas'][number]['id'];
  const infographicId = 'inf_test_admin_detail' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['recentEntities']['infographics'][number]['id'];
  const usageEventId1 = 'use_test_admin_detail_1' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['aiUsageEvents'][number]['id'];
  const usageEventId2 = 'use_test_admin_detail_2' as unknown as ComponentProps<
    typeof AdminUserDetailPage
  >['detail']['aiUsageEvents'][number]['id'];

  const detail: ComponentProps<typeof AdminUserDetailPage>['detail'] = {
    user: {
      id: 'user-1',
      name: 'Alice Example',
      email: 'alice@example.com',
      emailVerified: true,
      image: null,
      role: 'user',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-05T10:00:00.000Z',
    },
    entityCounts: {
      sources: 1,
      podcasts: 1,
      voiceovers: 1,
      personas: 1,
      infographics: 1,
    },
    recentEntities: {
      sources: [
        {
          id: sourceId,
          title: 'Quarterly Source',
          contentKey: `sources/${sourceId}.txt`,
          mimeType: 'text/plain',
          wordCount: 1200,
          source: 'manual',
          originalFileName: null,
          originalFileSize: null,
          metadata: null,
          status: 'ready',
          errorMessage: null,
          sourceUrl: null,
          researchConfig: null,
          jobId: null,
          contentHash: null,
          createdBy: 'user-1',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        },
      ],
      podcasts: [
        {
          id: podcastId,
          title: 'Quarterly Podcast',
          description: null,
          format: 'conversation',
          hostVoice: 'Charon',
          hostVoiceName: 'Charon',
          coHostVoice: 'Kore',
          coHostVoiceName: 'Kore',
          promptInstructions: null,
          targetDurationMinutes: 5,
          tags: [],
          sourceIds: [sourceId],
          status: 'ready',
          audioUrl: null,
          duration: null,
          errorMessage: null,
          hostPersonaId: null,
          coHostPersonaId: null,
          coverImageStorageKey: null,
          approvedBy: null,
          approvedAt: null,
          createdBy: 'user-1',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        },
      ],
      voiceovers: [
        {
          id: voiceoverId,
          title: 'Narration Track',
          text: 'Narration text',
          voice: 'Charon',
          voiceName: 'Charon',
          audioUrl: null,
          duration: null,
          sourceId: null,
          status: 'ready',
          errorMessage: null,
          approvedBy: null,
          approvedAt: null,
          createdBy: 'user-1',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        },
      ],
      personas: [
        {
          id: personaId,
          name: 'Host Persona',
          role: 'Analyst',
          personalityDescription: null,
          speakingStyle: null,
          exampleQuotes: [],
          voiceId: 'voice-1',
          voiceName: 'Charon',
          avatarStorageKey: null,
          createdBy: 'user-1',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      infographics: [
        {
          id: infographicId,
          title: 'Quarterly Infographic',
          prompt: null,
          styleProperties: [],
          format: 'portrait',
          sourceId: null,
          imageStorageKey: null,
          thumbnailStorageKey: null,
          status: 'ready',
          errorMessage: null,
          approvedBy: null,
          approvedAt: null,
          createdBy: 'user-1',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        },
      ],
    },
    aiUsageSummary: {
      totalEvents: 2,
      totalEstimatedCostUsdMicros: 6000,
      pricedEventCount: 2,
      byModality: [
        {
          modality: 'llm',
          count: 1,
          estimatedCostUsdMicros: 4200,
          pricedEventCount: 1,
        },
        {
          modality: 'tts',
          count: 1,
          estimatedCostUsdMicros: 1800,
          pricedEventCount: 1,
        },
      ],
      byProvider: [
        {
          provider: 'google',
          count: 2,
          estimatedCostUsdMicros: 6000,
          pricedEventCount: 2,
        },
      ],
      timeline: [
        {
          day: '2026-03-05',
          count: 1,
          estimatedCostUsdMicros: 1800,
          pricedEventCount: 1,
        },
        {
          day: '2026-03-04',
          count: 1,
          estimatedCostUsdMicros: 4200,
          pricedEventCount: 1,
        },
      ],
    },
    aiUsageEvents: [
      {
        id: usageEventId1,
        userId: 'user-1',
        requestId: null,
        jobId: null,
        scopeOperation: 'useCase.generatePodcast',
        resourceType: 'podcast',
        resourceId: podcastId,
        modality: 'llm',
        provider: 'google',
        providerOperation: 'generate-content',
        model: 'gemini-2.5-flash',
        status: 'succeeded',
        errorTag: null,
        usage: { inputTokens: 1200, outputTokens: 300 },
        metadata: null,
        rawUsage: null,
        estimatedCostUsdMicros: 4200,
        providerResponseId: null,
        createdAt: '2026-03-04T12:00:00.000Z',
      },
      {
        id: usageEventId2,
        userId: 'user-1',
        requestId: null,
        jobId: null,
        scopeOperation: 'useCase.generateVoiceover',
        resourceType: 'voiceover',
        resourceId: voiceoverId,
        modality: 'tts',
        provider: 'google',
        providerOperation: 'synthesize-speech',
        model: 'chirp-3',
        status: 'failed',
        errorTag: 'TTSQuotaExceededError',
        usage: { audioSeconds: 45 },
        metadata: null,
        rawUsage: null,
        estimatedCostUsdMicros: 1800,
        providerResponseId: null,
        createdAt: '2026-03-05T09:30:00.000Z',
      },
    ],
  };

  return {
    usagePeriod: '30d' as const,
    onUsagePeriodChange: vi.fn(),
    entityList: {
      entities: [
        {
          entityType: 'podcast' as const,
          entityId: podcastId,
          title: 'Quarterly Podcast',
          subtitle: 'conversation',
          status: 'ready',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-04T10:00:00.000Z',
        },
      ],
      total: 1,
      hasMore: false,
    },
    entityQuery: '',
    onEntityQueryChange: vi.fn(),
    entityType: 'all' as const,
    onEntityTypeChange: vi.fn(),
    entityPage: 1,
    onEntityPageChange: vi.fn(),
    isEntityFetching: false,
    detail,
    ...overrides,
  };
};

const renderPage = (
  overrides: Partial<ComponentProps<typeof AdminUserDetailPage>> = {},
) => render(<AdminUserDetailPage {...createProps(overrides)} />);

const selectSection = async (
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) => {
  await user.selectOptions(screen.getByLabelText('Select section'), value);
};

describe('AdminUserDetailPage', () => {
  it('renders the section selector and switches between detail areas', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Alice Example' }),
    ).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Select section')).toHaveValue('sources');
    expect(screen.getByText('Quarterly Source')).toBeInTheDocument();
    expect(screen.queryByText('Quarterly Podcast')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Activity')).not.toBeInTheDocument();

    await selectSection(user, 'podcasts');

    expect(screen.getByText('Quarterly Podcast')).toBeInTheDocument();
    expect(screen.queryByText('Quarterly Source')).not.toBeInTheDocument();

    await selectSection(user, 'voiceovers');

    expect(screen.getByText('Narration Track')).toBeInTheDocument();

    await selectSection(user, 'personas');

    expect(screen.getByText('Host Persona')).toBeInTheDocument();

    await selectSection(user, 'infographics');

    expect(screen.getByText('Quarterly Infographic')).toBeInTheDocument();

    await selectSection(user, 'entity-explorer');

    expect(
      screen.getByRole('textbox', { name: 'Search content' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'All Content' }),
    ).toBeInTheDocument();

    await selectSection(user, 'ai-usage');

    expect(screen.getByText('AI Activity')).toBeInTheDocument();
    expect(screen.getByText(/generate-content/)).toBeInTheDocument();
    expect(screen.getByText('TTSQuotaExceededError')).toBeInTheDocument();
    expect(screen.getAllByText('$0.0060').length).toBeGreaterThan(0);
    expect(screen.queryByText('verified')).not.toBeInTheDocument();
    expect(screen.queryByText('unverified')).not.toBeInTheDocument();
  });

  it('changes AI usage period when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onUsagePeriodChange = vi.fn();
    renderPage({ onUsagePeriodChange });

    await selectSection(user, 'ai-usage');
    await user.click(screen.getByRole('tab', { name: '90d' }));

    expect(onUsagePeriodChange).toHaveBeenCalledWith('90d');
  });

  it('shows empty states when there are no entities or usage rows', async () => {
    const user = userEvent.setup();
    renderPage({
      entityList: {
        entities: [],
        total: 0,
        hasMore: false,
      },
      detail: {
        ...createProps().detail,
        entityCounts: {
          sources: 0,
          podcasts: 0,
          voiceovers: 0,
          personas: 0,
          infographics: 0,
        },
        recentEntities: {
          sources: [],
          podcasts: [],
          voiceovers: [],
          personas: [],
          infographics: [],
        },
        aiUsageSummary: {
          totalEvents: 0,
          totalEstimatedCostUsdMicros: 0,
          pricedEventCount: 0,
          byModality: [],
          byProvider: [],
          timeline: [],
        },
        aiUsageEvents: [],
      },
    });

    expect(screen.getByText('No sources yet.')).toBeInTheDocument();

    await selectSection(user, 'entity-explorer');

    expect(screen.getByText('No content yet')).toBeInTheDocument();

    await selectSection(user, 'ai-usage');

    expect(
      screen.getAllByText('No usage in this period.').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('No AI usage events recorded for this period.'),
    ).toBeInTheDocument();
  });

  it('shows pricing pending when usage exists without estimated prices', async () => {
    const user = userEvent.setup();
    renderPage({
      detail: {
        ...createProps().detail,
        aiUsageSummary: {
          totalEvents: 2,
          totalEstimatedCostUsdMicros: 0,
          pricedEventCount: 0,
          byModality: [
            {
              modality: 'llm',
              count: 1,
              estimatedCostUsdMicros: 0,
              pricedEventCount: 0,
            },
          ],
          byProvider: [
            {
              provider: 'google',
              count: 2,
              estimatedCostUsdMicros: 0,
              pricedEventCount: 0,
            },
          ],
          timeline: [
            {
              day: '2026-03-05',
              count: 2,
              estimatedCostUsdMicros: 0,
              pricedEventCount: 0,
            },
          ],
        },
        aiUsageEvents: createProps().detail.aiUsageEvents.map((event) => ({
          ...event,
          estimatedCostUsdMicros: null,
        })),
      },
    });

    await selectSection(user, 'ai-usage');

    expect(screen.getAllByText('Pricing pending').length).toBeGreaterThan(1);
    expect(
      screen.getByText('Usage recorded, provider pricing not configured yet'),
    ).toBeInTheDocument();
  });
});
