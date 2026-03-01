import { useCallback, useState } from 'react';
import type { PersonaSynthesisPreview } from '@/shared/components/synthesis-preview-card';
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
  const [preview, setPreview] = useState<PersonaSynthesisPreview | null>(null);

  const isCreatingPersona = createMutation.isPending;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setPreview(null);
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

  const handleSynthesize = useCallback(() => {
    if (chat.messages.length === 0 || synthesizeMutation.isPending) return;

    synthesizeMutation.mutate(chat.messages, {
      onSuccess: (result) => {
        setPreview(result);
      },
    });
  }, [chat.messages, synthesizeMutation]);

  const handleConfirmPersona = useCallback(() => {
    if (!preview || isCreatingPersona) return;

    createMutation.mutate(
      {
        name: preview.name,
        role: preview.role,
        personalityDescription: preview.personalityDescription,
        speakingStyle: preview.speakingStyle,
        exampleQuotes: [...preview.exampleQuotes],
        voiceId: preview.voiceId,
        voiceName: preview.voiceName,
      },
      {
        onSuccess: () => handleOpenChange(false),
      },
    );
  }, [preview, isCreatingPersona, createMutation, handleOpenChange]);

  const handleDismissPreview = useCallback(() => {
    setPreview(null);
    chat.extendFollowUps();
  }, [chat]);

  return (
    <PersonaChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      synthesizeError={synthesizeMutation.error ?? undefined}
      createError={createMutation.error ?? undefined}
      canCreatePersona={chat.canCreatePersona}
      autoCreateReady={chat.shouldAutoCreate}
      onSendMessage={handleSendMessage}
      onSynthesize={handleSynthesize}
      isSynthesizing={synthesizeMutation.isPending}
      preview={preview}
      onConfirmPersona={handleConfirmPersona}
      isCreatingPersona={isCreatingPersona}
      onDismissPreview={handleDismissPreview}
      followUpCount={chat.followUpCount}
      followUpLimit={chat.followUpLimit}
      onKeepRefining={chat.extendFollowUps}
    />
  );
}
