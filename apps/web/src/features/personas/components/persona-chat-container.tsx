import { useCallback, useEffect, useRef } from 'react';
import { usePersonaChat } from '../hooks/use-persona-chat';
import { useCreatePersona } from '../hooks/use-persona-mutations';
import { useSynthesizePersona } from '../hooks/use-synthesize-persona';
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
  const autoCreateTriggeredRef = useRef(false);

  const isCreatingPersona =
    synthesizeMutation.isPending || createMutation.isPending;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        autoCreateTriggeredRef.current = false;
        chat.reset();
      }
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
    if (chat.messages.length === 0 || isCreatingPersona) return;
    autoCreateTriggeredRef.current = true;

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
  }, [
    chat.messages,
    isCreatingPersona,
    synthesizeMutation,
    createMutation,
    handleOpenChange,
  ]);

  const synthesizeError =
    synthesizeMutation.error ?? createMutation.error ?? undefined;

  useEffect(() => {
    if (!open || autoCreateTriggeredRef.current) return;
    if (!chat.shouldAutoCreate || chat.isStreaming || isCreatingPersona) return;
    handleCreatePersona();
  }, [
    open,
    chat.shouldAutoCreate,
    chat.isStreaming,
    isCreatingPersona,
    handleCreatePersona,
  ]);

  return (
    <PersonaChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      synthesizeError={synthesizeError}
      canCreatePersona={chat.canCreatePersona}
      autoCreateReady={chat.shouldAutoCreate}
      onSendMessage={handleSendMessage}
      onCreatePersona={handleCreatePersona}
      isCreatingPersona={isCreatingPersona}
    />
  );
}
