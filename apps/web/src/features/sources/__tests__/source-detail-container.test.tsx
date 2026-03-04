import { SourceStatus } from '@repo/api/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SourceDetailContainer } from '../components/source-detail-container';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import { useSource, useSourceContentOptional } from '../hooks/use-source';
import { useSourceActions } from '../hooks/use-source-actions';
import { useSourceSearch } from '../hooks/use-source-search';
import { render } from '@/test-utils';

const {
  sourceDetailSpy,
  voiceoverMutate,
  infographicMutate,
  retryMutate,
  navigateSpy,
  invalidateQueriesSpy,
} = vi.hoisted(() => ({
  sourceDetailSpy: vi.fn(),
  voiceoverMutate: vi.fn(),
  infographicMutate: vi.fn(),
  retryMutate: vi.fn(),
  navigateSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
}));

vi.mock('../hooks/use-source', async () => {
  const actual = await vi.importActual('../hooks/use-source');
  return {
    ...actual,
    useSource: vi.fn(),
    useSourceContentOptional: vi.fn(),
  };
});

vi.mock('../hooks/use-source-actions', () => ({
  useSourceActions: vi.fn(),
}));

vi.mock('../hooks/use-source-search', () => ({
  useSourceSearch: vi.fn(),
}));

vi.mock('../hooks/use-retry-processing', () => ({
  useRetryProcessing: vi.fn(),
}));

vi.mock('../components/source-detail', () => ({
  SourceDetail: (props: Record<string, unknown>) => {
    sourceDetailSpy(props);
    return <div data-testid="source-detail" />;
  },
}));

vi.mock('@/shared/components/confirmation-dialog/confirmation-dialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/shared/hooks', () => ({
  useKeyboardShortcut: vi.fn(),
  useNavigationBlock: vi.fn(),
}));

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  };
});

function createSource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'doc-1',
    title: 'Quarterly Report',
    status: SourceStatus.READY,
    source: 'manual',
    errorMessage: null,
    wordCount: 100,
    mimeType: 'text/plain',
    originalFileName: 'report.txt',
    originalFileSize: 100,
    sourceUrl: null,
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    ...overrides,
  };
}

function setupSource({
  status = SourceStatus.READY,
  content = 'Content body',
}: {
  status?: SourceStatus;
  content?: string | null;
}) {
  vi.mocked(useSource).mockReturnValue({
    data: createSource({ status }),
  } as never);
  vi.mocked(useSourceContentOptional).mockReturnValue({
    data: content === null ? undefined : { content },
  } as never);
}

function getLastDetailProps<T>(): T | undefined {
  const lastCall =
    sourceDetailSpy.mock.calls[sourceDetailSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
}

type DetailProps = {
  canExport: boolean;
  canCreateFromSource: boolean;
  onCreateVoiceover?: () => void;
  onCreateInfographic?: () => void;
};

const renderContainer = () =>
  render(<SourceDetailContainer sourceId="doc-1" />);

const getDetailProps = () => getLastDetailProps<DetailProps>();

describe('SourceDetailContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setupSource({});

    vi.mocked(useSourceActions).mockReturnValue({
      title: 'Quarterly Report',
      setTitle: vi.fn(),
      hasChanges: false,
      isSaving: false,
      isDeleting: false,
      handleSave: vi.fn(),
      discardChanges: vi.fn(),
      handleDelete: vi.fn(),
    } as never);
    vi.mocked(useSourceSearch).mockReturnValue({
      query: '',
      matches: [],
      currentMatchIndex: -1,
      isOpen: false,
      open: vi.fn(),
      close: vi.fn(),
      setQuery: vi.fn(),
      clear: vi.fn(),
      nextMatch: vi.fn(),
      previousMatch: vi.fn(),
    } as never);
    vi.mocked(useRetryProcessing).mockReturnValue({
      mutate: retryMutate,
      isPending: false,
    } as never);

    vi.mocked(useMutation)
      .mockReturnValueOnce({
        mutate: voiceoverMutate,
        isPending: false,
      } as never)
      .mockReturnValueOnce({
        mutate: infographicMutate,
        isPending: false,
      } as never);

    vi.mocked(useNavigate).mockReturnValue(navigateSpy as never);
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: invalidateQueriesSpy,
    } as never);
  });

  it.each([
    {
      name: 'uses fetched content for ready sources',
      status: SourceStatus.READY,
      content: 'Alpha beta',
      expectedSearchInput: 'Alpha beta',
      canExport: true,
      canCreateFromSource: true,
    },
    {
      name: 'falls back to empty content for non-ready sources',
      status: SourceStatus.PROCESSING,
      content: null,
      expectedSearchInput: '',
      canExport: false,
      canCreateFromSource: false,
    },
  ])(
    '$name',
    ({
      status,
      content,
      expectedSearchInput,
      canExport,
      canCreateFromSource,
    }) => {
      setupSource({ status, content });

      renderContainer();

      expect(vi.mocked(useSourceSearch)).toHaveBeenCalledWith(
        expectedSearchInput,
      );
      expect(getDetailProps()).toMatchObject({
        canExport,
        canCreateFromSource,
      });
    },
  );

  it('forwards create actions to voiceover and infographic mutations', () => {
    renderContainer();
    getDetailProps()?.onCreateVoiceover?.();
    getDetailProps()?.onCreateInfographic?.();

    expect(voiceoverMutate).toHaveBeenCalledWith({
      title: 'Voiceover: Quarterly Report',
      sourceId: 'doc-1',
    });
    expect(infographicMutate).toHaveBeenCalledWith({
      title: 'Infographic: Quarterly Report',
      format: 'portrait',
      sourceId: 'doc-1',
    });
  });
});
