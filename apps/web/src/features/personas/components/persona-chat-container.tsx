import { useCallback } from 'react';
import { usePersonaChat } from '../hooks/use-persona-chat';
import {
  useSynthesizePersona,
  type PersonaSynthesis,
} from '../hooks/use-synthesize-persona';
import { PersonaChatDialog } from './persona-chat-dialog';

interface PersonaChatContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPersona: (persona: PersonaSynthesis) => void;
  title?: string;
  description?: string;
  promptIntro?: string;
  confirmActionLabel?: string;
  pendingActionLabel?: string;
  errorMessage?: string;
  followUpPlaceholder?: string;
  initialPlaceholder?: string;
}

export function PersonaChatContainer({
  open,
  onOpenChange,
  onApplyPersona,
  title,
  description,
  promptIntro,
  confirmActionLabel,
  pendingActionLabel,
  errorMessage,
  followUpPlaceholder,
  initialPlaceholder,
}: PersonaChatContainerProps) {
  const chat = usePersonaChat();
  const synthesizeMutation = useSynthesizePersona();

  const isCreatingPersona = synthesizeMutation.isPending;
  const createError = synthesizeMutation.error ?? undefined;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        chat.reset();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, chat],
  );

  const handleCreatePersona = useCallback(() => {
    if (chat.messages.length === 0 || isCreatingPersona) return;

    synthesizeMutation.mutate(chat.messages, {
      onSuccess: (result) => {
        onApplyPersona({
          ...result,
          exampleQuotes: [...result.exampleQuotes],
        });
        handleOpenChange(false);
      },
    });
  }, [
    chat.messages,
    isCreatingPersona,
    synthesizeMutation,
    onApplyPersona,
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
      onSendMessage={(text) => chat.sendMessage({ text })}
      onCreatePersona={handleCreatePersona}
      isCreatingPersona={isCreatingPersona}
      followUpCount={chat.followUpCount}
      followUpLimit={chat.followUpLimit}
      onKeepRefining={chat.extendFollowUps}
      title={title}
      description={description}
      promptIntro={promptIntro}
      confirmActionLabel={confirmActionLabel}
      pendingActionLabel={pendingActionLabel}
      errorMessage={errorMessage}
      followUpPlaceholder={followUpPlaceholder}
      initialPlaceholder={initialPlaceholder}
    />
  );
}
