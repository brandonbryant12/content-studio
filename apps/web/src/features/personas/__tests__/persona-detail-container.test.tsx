import { act, render } from '@/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonaDetailContainer } from '../components/persona-detail-container';
import {
  useDeletePersona,
  useGenerateAvatar,
  useUpdatePersona,
} from '../hooks/use-persona-mutations';
import { usePersona } from '../hooks/use-persona';
import { useNavigationBlock } from '@/shared/hooks';

const { personaDetailSpy, updateMutate, deleteMutate, avatarMutate } =
  vi.hoisted(() => ({
    personaDetailSpy: vi.fn(),
    updateMutate: vi.fn(),
    deleteMutate: vi.fn(),
    avatarMutate: vi.fn(),
  }));

vi.mock('../hooks/use-persona', () => ({
  usePersona: vi.fn(),
}));

vi.mock('../hooks/use-persona-mutations', () => ({
  useUpdatePersona: vi.fn(),
  useDeletePersona: vi.fn(),
  useGenerateAvatar: vi.fn(),
}));

vi.mock('../components/persona-detail', () => ({
  PersonaDetail: (props: Record<string, unknown>) => {
    personaDetailSpy(props);
    return <div data-testid="persona-detail" />;
  },
}));

vi.mock('@/shared/hooks', () => ({
  useNavigationBlock: vi.fn(),
}));

function createMockPersona(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'persona-1',
    name: 'Ava',
    role: null,
    personalityDescription: null,
    speakingStyle: null,
    exampleQuotes: [],
    voiceId: null,
    voiceName: null,
    avatarStorageKey: null,
    createdBy: 'user-1',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    ...overrides,
  };
}

const setPersona = (overrides: Partial<Record<string, unknown>> = {}) => {
  vi.mocked(usePersona).mockReturnValue({
    data: createMockPersona(overrides),
  } as never);
};

function getLastPersonaDetailProps<T>(): T | undefined {
  const lastCall =
    personaDetailSpy.mock.calls[personaDetailSpy.mock.calls.length - 1];
  return lastCall?.[0] as T | undefined;
}

type FormValuesInput = {
  name: string;
  role: string;
  personalityDescription: string;
  speakingStyle: string;
  exampleQuotes: string[];
  voiceId: string;
  voiceName: string;
};

const DEFAULT_FORM_VALUES: FormValuesInput = {
  name: 'Ava',
  role: '',
  personalityDescription: '',
  speakingStyle: '',
  exampleQuotes: [],
  voiceId: '',
  voiceName: '',
};

const renderContainer = () =>
  render(<PersonaDetailContainer personaId="persona-1" />);

const changeForm = (overrides: Partial<FormValuesInput>) => {
  const onFormChange = getLastPersonaDetailProps<{
    onFormChange: (values: FormValuesInput) => void;
  }>()?.onFormChange;
  onFormChange?.({ ...DEFAULT_FORM_VALUES, ...overrides });
};

const saveForm = () => {
  const onSave = getLastPersonaDetailProps<{ onSave: () => void }>()?.onSave;
  onSave?.();
};

describe('PersonaDetailContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUpdatePersona).mockReturnValue({
      mutate: updateMutate,
      isPending: false,
    } as never);
    vi.mocked(useDeletePersona).mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
    } as never);
    vi.mocked(useGenerateAvatar).mockReturnValue({
      mutate: avatarMutate,
      isPending: false,
    } as never);

    setPersona();
  });

  it('maps null persona fields to empty form values', () => {
    renderContainer();

    expect(
      getLastPersonaDetailProps<{
        formValues: {
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          voiceId: string;
          voiceName: string;
        };
      }>()?.formValues,
    ).toMatchObject({
      role: '',
      personalityDescription: '',
      speakingStyle: '',
      voiceId: '',
      voiceName: '',
    });
    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: false,
    });
  });

  it('sanitizes optional fields and clears draft after save success', () => {
    updateMutate.mockImplementation(
      (
        _input: unknown,
        options?: {
          onSuccess?: () => void;
        },
      ) => {
        options?.onSuccess?.();
      },
    );

    renderContainer();

    act(() => {
      changeForm({
        name: 'Updated Persona',
        exampleQuotes: ['   ', 'Keep this quote'],
      });
    });

    act(() => {
      saveForm();
    });

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'persona-1',
        name: 'Updated Persona',
        role: undefined,
        personalityDescription: undefined,
        speakingStyle: undefined,
        exampleQuotes: ['Keep this quote'],
        voiceId: undefined,
        voiceName: undefined,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(
      getLastPersonaDetailProps<{
        hasChanges: boolean;
      }>()?.hasChanges,
    ).toBe(false);
  });

  it('blocks navigation when form values diverge from server values', () => {
    renderContainer();

    act(() => {
      changeForm({
        name: 'Ava Updated',
      });
    });

    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: true,
    });
  });
});
