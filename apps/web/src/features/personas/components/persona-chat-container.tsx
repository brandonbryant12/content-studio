import { useCallback } from 'react';
import { usePersonaChat } from '../hooks/use-persona-chat';
import { useSynthesizePersona } from '../hooks/use-synthesize-persona';
import { useCreatePersona } from '../hooks/use-persona-mutations';
import { PersonaChatDialog } from './persona-chat-dialog';

interface PersonaChatContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonaChatContainer({
  open,
  onOpenChange,
}: PersonaChatContainerProps) {
  const chat = usePersonaChat();
  const synthesizeMutation = useSynthesizePersona();
  const createMutation = useCreatePersona();

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) chat.reset();
      onOpenChange(isOpen);
    },
    [onOpenChange, chat],
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      chat.sendMessage({ text });
    },
    [chat],
  );

  const handleCreatePersona = useCallback(() => {
    synthesizeMutation.mutate(chat.messages, {
      onSuccess: (persona) => {
        createMutation.mutate(
          {
            name: persona.name,
            role: persona.role,
            personalityDescription: persona.personalityDescription,
            speakingStyle: persona.speakingStyle,
            exampleQuotes: [...persona.exampleQuotes],
            voiceId: persona.voiceId,
            voiceName: persona.voiceName,
          },
          {
            onSuccess: () => handleOpenChange(false),
          },
        );
      },
    });
  }, [synthesizeMutation, createMutation, chat.messages, handleOpenChange]);

  const isCreatingPersona =
    synthesizeMutation.isPending || createMutation.isPending;

  const synthesizeError =
    synthesizeMutation.error ?? createMutation.error ?? undefined;

  return (
    <PersonaChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      synthesizeError={synthesizeError}
      canCreatePersona={chat.canCreatePersona}
      onSendMessage={handleSendMessage}
      onCreatePersona={handleCreatePersona}
      isCreatingPersona={isCreatingPersona}
    />
  );
}
