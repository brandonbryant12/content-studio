import { SourceStatus } from '@repo/api/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as UseDocumentModule from '../hooks/use-document';
import type * as TanstackReactQueryModule from '@tanstack/react-query';
import type * as TanstackReactRouterModule from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { DocumentDetailContainer } from '../components/document-detail-container';
import { useDocument, useDocumentContentOptional } from '../hooks/use-document';
import { useDocumentActions } from '../hooks/use-document-actions';
import { useDocumentSearch } from '../hooks/use-document-search';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import { render } from '@/test-utils';

const {
  documentDetailSpy,
  voiceoverMutate,
  infographicMutate,
  retryMutate,
  navigateSpy,
  invalidateQueriesSpy,
} = vi.hoisted(() => ({
  documentDetailSpy: vi.fn(),
  voiceoverMutate: vi.fn(),
  infographicMutate: vi.fn(),
  retryMutate: vi.fn(),
  navigateSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
}));

vi.mock('../hooks/use-document', async () => {
  const actual =
    await vi.importActual<UseDocumentModule>('../hooks/use-document');
  return {
    ...actual,
    useDocument: vi.fn(),
    useDocumentContentOptional: vi.fn(),
  };
});

vi.mock('../hooks/use-document-actions', () => ({
  useDocumentActions: vi.fn(),
}));

vi.mock('../hooks/use-document-search', () => ({
  useDocumentSearch: vi.fn(),
}));

vi.mock('../hooks/use-retry-processing', () => ({
  useRetryProcessing: vi.fn(),
}));

vi.mock('../components/document-detail', () => ({
  DocumentDetail: (props: Record<string, unknown>) => {
    documentDetailSpy(props);
    return <div data-testid="document-detail" />;
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
  const actual = await vi.importActual<TanstackReactQueryModule>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<TanstackReactRouterModule>(
    '@tanstack/react-router',
  );
  return {
    ...actual,
    useNavigate: vi.fn(),
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  };
});

function createDocument(overrides: Partial<Record<string, unknown>> = {}) {
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

function setupDocument({
  status = SourceStatus.READY,
  content = 'Content body',
}: {
  status?: SourceStatus;
  content?: string | null;
}) {
  vi.mocked(useDocument).mockReturnValue({
    data: createDocument({ status }),
  } as never);
  vi.mocked(useDocumentContentOptional).mockReturnValue({
    data: content === null ? undefined : { content },
  } as never);
}

function getLastDetailProps<T>(): T | undefined {
  const lastCall =
    documentDetailSpy.mock.calls[documentDetailSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
}

type DetailProps = {
  canExport: boolean;
  canCreateFromDocument: boolean;
  onCreateVoiceover?: () => void;
  onCreateInfographic?: () => void;
};

const renderContainer = () =>
  render(<DocumentDetailContainer documentId="doc-1" />);

const getDetailProps = () => getLastDetailProps<DetailProps>();

describe('DocumentDetailContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setupDocument({});

    vi.mocked(useDocumentActions).mockReturnValue({
      title: 'Quarterly Report',
      setTitle: vi.fn(),
      hasChanges: false,
      isSaving: false,
      isDeleting: false,
      handleSave: vi.fn(),
      discardChanges: vi.fn(),
      handleDelete: vi.fn(),
    } as never);
    vi.mocked(useDocumentSearch).mockReturnValue({
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
      name: 'uses fetched content for ready documents',
      status: SourceStatus.READY,
      content: 'Alpha beta',
      expectedSearchInput: 'Alpha beta',
      canExport: true,
      canCreateFromDocument: true,
    },
    {
      name: 'falls back to empty content for non-ready documents',
      status: SourceStatus.PROCESSING,
      content: null,
      expectedSearchInput: '',
      canExport: false,
      canCreateFromDocument: false,
    },
  ])(
    '$name',
    ({
      status,
      content,
      expectedSearchInput,
      canExport,
      canCreateFromDocument,
    }) => {
      setupDocument({ status, content });

      renderContainer();

      expect(vi.mocked(useDocumentSearch)).toHaveBeenCalledWith(
        expectedSearchInput,
      );
      expect(getDetailProps()).toMatchObject({
        canExport,
        canCreateFromDocument,
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
