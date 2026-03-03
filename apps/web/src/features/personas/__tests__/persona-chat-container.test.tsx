import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonaChatContainer } from '../components/persona-chat-container';
import { render, screen, userEvent } from '@/test-utils';

const {
  mockUsePersonaChat,
  mockUseSynthesizePersona,
  mockUseCreatePersona,
  synthesizeMutate,
  createMutate,
} = vi.hoisted(() => ({
  mockUsePersonaChat: vi.fn(),
  mockUseSynthesizePersona: vi.fn(),
  mockUseCreatePersona: vi.fn(),
  synthesizeMutate: vi.fn(),
  createMutate: vi.fn(),
}));

vi.mock('../hooks/use-persona-chat', () => ({
  usePersonaChat: mockUsePersonaChat,
}));

vi.mock('../hooks/use-synthesize-persona', () => ({
  useSynthesizePersona: mockUseSynthesizePersona,
}));

vi.mock('../hooks/use-persona-mutations', () => ({
  useCreatePersona: mockUseCreatePersona,
}));

vi.mock('../components/persona-chat-dialog', () => ({
  PersonaChatDialog: ({ onCreatePersona }: { onCreatePersona: () => void }) => (
    <div>
      <button onClick={onCreatePersona}>Create Persona</button>
    </div>
  ),
}));

describe('PersonaChatContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUsePersonaChat.mockReturnValue({
      messages: [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'x' }] },
      ],
      sendMessage: vi.fn(),
      isStreaming: false,
      error: undefined,
      canCreatePersona: true,
      shouldAutoCreate: false,
      followUpCount: 1,
      followUpLimit: 2,
      extendFollowUps: vi.fn(),
      reset: vi.fn(),
    });

    synthesizeMutate.mockImplementation(
      (
        _messages: unknown,
        options?: {
          onSuccess?: (data: {
            name: string;
            role: string;
            personalityDescription: string;
            speakingStyle: string;
            exampleQuotes: string[];
            voiceId: string;
            voiceName: string;
          }) => void;
        },
      ) => {
        options?.onSuccess?.({
          name: 'Ava',
          role: 'Research Host',
          personalityDescription: 'Analytical and warm',
          speakingStyle: 'Clear and concise',
          exampleQuotes: ["Let's break this down."],
          voiceId: 'voice-1',
          voiceName: 'Aoede',
        });
      },
    );

    createMutate.mockImplementation(
      (_input: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    mockUseSynthesizePersona.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: false,
      error: undefined,
    });

    mockUseCreatePersona.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: undefined,
    });
  });

  it('creates persona from one click', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<PersonaChatContainer open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Create Persona' }));

    expect(synthesizeMutate).toHaveBeenCalled();
    expect(createMutate).toHaveBeenCalledWith(
      {
        name: 'Ava',
        role: 'Research Host',
        personalityDescription: 'Analytical and warm',
        speakingStyle: 'Clear and concise',
        exampleQuotes: ["Let's break this down."],
        voiceId: 'voice-1',
        voiceName: 'Aoede',
      },
      expect.anything(),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not trigger while creating is pending', async () => {
    const user = userEvent.setup();

    mockUseSynthesizePersona.mockReturnValue({
      mutate: synthesizeMutate,
      isPending: true,
      error: undefined,
    });

    render(<PersonaChatContainer open={true} onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Create Persona' }));

    expect(synthesizeMutate).not.toHaveBeenCalled();
    expect(createMutate).not.toHaveBeenCalled();
  });
});
