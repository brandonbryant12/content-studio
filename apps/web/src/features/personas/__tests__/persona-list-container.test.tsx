import { useNavigate } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as TanstackReactRouter from '@tanstack/react-router';
import { PersonaListContainer } from '../components/persona-list-container';
import { usePersonaList } from '../hooks/use-persona-list';
import { useBulkDelete, useBulkSelection } from '@/shared/hooks';
import { act, render } from '@/test-utils';

const { navigateMock, personaListSpy } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  personaListSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof TanstackReactRouter>(
    '@tanstack/react-router',
  );

  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../hooks/use-persona-list', () => ({
  usePersonaList: vi.fn(),
  getPersonaListQueryKey: vi.fn(() => ['personas']),
}));

vi.mock('@/shared/hooks', () => ({
  useBulkSelection: vi.fn(),
  useBulkDelete: vi.fn(),
}));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    personas: {
      delete: {
        mutationOptions: () => ({
          mutationFn: vi.fn(),
        }),
      },
    },
  },
}));

vi.mock('../components/persona-list', () => ({
  PersonaList: (props: Record<string, unknown>) => {
    personaListSpy(props);
    return <div data-testid="persona-list" />;
  },
}));

function getLastListProps<T>(): T | undefined {
  return personaListSpy.mock.calls[
    personaListSpy.mock.calls.length - 1
  ]?.[0] as T | undefined;
}

describe('PersonaListContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(navigateMock as never);
    vi.mocked(usePersonaList).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useBulkSelection).mockReturnValue({
      selectedIds: [],
      deselectAll: vi.fn(),
    } as never);
    vi.mocked(useBulkDelete).mockReturnValue({
      executeBulkDelete: vi.fn(),
      isBulkDeleting: false,
    } as never);
  });

  it('navigates to the blank persona route when create is clicked', () => {
    render(<PersonaListContainer />);

    act(() => {
      getLastListProps<{ onCreate: () => void }>()?.onCreate();
    });

    expect(navigateMock).toHaveBeenCalledWith({ to: '/personas/new' });
  });
});
