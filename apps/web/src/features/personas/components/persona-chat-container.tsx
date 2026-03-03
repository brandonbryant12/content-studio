import { useCallback } from 'react';
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

  const isCreatingPersona =
    synthesizeMutation.isPending || createMutation.isPending;
  const createError =
    synthesizeMutation.error ?? createMutation.error ?? undefined;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
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

    synthesizeMutation.mutate(chat.messages, {
      onSuccess: (result) => {
        createMutation.mutate(
          {
            name: result.name,
            role: result.role,
            personalityDescription: result.personalityDescription,
            speakingStyle: result.speakingStyle,
            exampleQuotes: [...result.exampleQuotes],
            voiceId: result.voiceId,
            voiceName: result.voiceName,
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

  return (
    <PersonaChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      createError={createError}
      canCreatePersona={chat.canCreatePersona}
      autoCreateReady={chat.shouldAutoCreate}
      onSendMessage={handleSendMessage}
      onCreatePersona={handleCreatePersona}
      isCreatingPersona={isCreatingPersona}
      followUpCount={chat.followUpCount}
      followUpLimit={chat.followUpLimit}
      onKeepRefining={chat.extendFollowUps}
    />
  );
}
