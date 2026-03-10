import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonaCreateContainer } from '../components/persona-create-container';
import { useCreatePersona } from '../hooks/use-persona-mutations';
import { useNavigationBlock } from '@/shared/hooks';
import { act, render, waitFor } from '@/test-utils';

const { navigateSpy, personaCreateSpy, personaChatSpy, createMutate } =
  vi.hoisted(() => ({
    navigateSpy: vi.fn(),
    personaCreateSpy: vi.fn(),
    personaChatSpy: vi.fn(),
    createMutate: vi.fn(),
  }));

vi.mock('../hooks/use-persona-mutations', () => ({
  useCreatePersona: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

vi.mock('@/shared/hooks', () => ({
  useNavigationBlock: vi
    .fn()
    .mockReturnValue({ isBlocked: false, proceed: vi.fn(), reset: vi.fn() }),
}));

vi.mock('../components/persona-create', () => ({
  PersonaCreate: (props: Record<string, unknown>) => {
    personaCreateSpy(props);
    return <div data-testid="persona-create" />;
  },
}));

vi.mock('../components/persona-chat-container', () => ({
  PersonaChatContainer: (props: Record<string, unknown>) => {
    personaChatSpy(props);
    return <div data-testid="persona-chat-container" />;
  },
}));

function getLastCreateProps<T>(): T | undefined {
  return personaCreateSpy.mock.calls[
    personaCreateSpy.mock.calls.length - 1
  ]?.[0] as T | undefined;
}

function getLastChatProps<T>(): T | undefined {
  return personaChatSpy.mock.calls[
    personaChatSpy.mock.calls.length - 1
  ]?.[0] as T | undefined;
}

describe('PersonaCreateContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigationBlock).mockReturnValue({
      isBlocked: false,
      proceed: vi.fn(),
      reset: vi.fn(),
    });
    vi.mocked(useCreatePersona).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as never);
  });

  it('starts with a blank draft and no navigation block', () => {
    render(<PersonaCreateContainer />);

    expect(
      getLastCreateProps<{
        formValues: {
          name: string;
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          voiceId: string;
          voiceName: string;
        };
      }>()?.formValues,
    ).toMatchObject({
      name: '',
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

  it('sanitizes optional fields before creating a persona', () => {
    render(<PersonaCreateContainer />);

    act(() => {
      getLastCreateProps<{
        onFormChange: (values: {
          name: string;
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          exampleQuotes: string[];
          voiceId: string;
          voiceName: string;
        }) => void;
      }>()?.onFormChange({
        name: 'Draft Persona',
        role: '',
        personalityDescription: '',
        speakingStyle: 'Measured and direct',
        exampleQuotes: ['  ', 'Keep me'],
        voiceId: '',
        voiceName: '',
      });
    });

    act(() => {
      getLastCreateProps<{ onSave: () => void }>()?.onSave();
    });

    expect(createMutate).toHaveBeenCalledWith(
      {
        name: 'Draft Persona',
        role: undefined,
        personalityDescription: undefined,
        speakingStyle: 'Measured and direct',
        exampleQuotes: ['Keep me'],
        voiceId: undefined,
        voiceName: undefined,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('applies the AI draft to the form values', () => {
    render(<PersonaCreateContainer />);

    act(() => {
      getLastChatProps<{
        onApplyPersona: (draft: {
          name: string;
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          exampleQuotes: string[];
          voiceId: string;
          voiceName: string;
        }) => void;
      }>()?.onApplyPersona({
        name: 'Ava Stone',
        role: 'Client Podcast Host',
        personalityDescription: 'Practical and confident.',
        speakingStyle: 'Crisp and direct.',
        exampleQuotes: ['Let us make this useful.'],
        voiceId: 'Puck',
        voiceName: 'Puck',
      });
    });

    expect(
      getLastCreateProps<{
        formValues: {
          name: string;
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          exampleQuotes: string[];
          voiceId: string;
          voiceName: string;
        };
      }>()?.formValues,
    ).toMatchObject({
      name: 'Ava Stone',
      role: 'Client Podcast Host',
      personalityDescription: 'Practical and confident.',
      speakingStyle: 'Crisp and direct.',
      exampleQuotes: ['Let us make this useful.'],
      voiceId: 'Puck',
      voiceName: 'Puck',
    });
    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: true,
    });
  });

  it('drops the navigation blocker before redirecting to the saved persona', async () => {
    createMutate.mockImplementation(
      (
        _values: unknown,
        options?: {
          onSuccess?: (data: { id: string }) => void;
        },
      ) => {
        options?.onSuccess?.({ id: 'persona_saved' });
      },
    );

    render(<PersonaCreateContainer />);

    act(() => {
      getLastCreateProps<{
        onFormChange: (values: {
          name: string;
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          exampleQuotes: string[];
          voiceId: string;
          voiceName: string;
        }) => void;
      }>()?.onFormChange({
        name: 'Saved Persona',
        role: '',
        personalityDescription: '',
        speakingStyle: '',
        exampleQuotes: [],
        voiceId: '',
        voiceName: '',
      });
    });

    act(() => {
      getLastCreateProps<{ onSave: () => void }>()?.onSave();
    });

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith({
        to: '/personas/$personaId',
        params: { personaId: 'persona_saved' },
      });
    });
    expect(vi.mocked(useNavigationBlock)).toHaveBeenLastCalledWith({
      shouldBlock: false,
    });
  });
});
