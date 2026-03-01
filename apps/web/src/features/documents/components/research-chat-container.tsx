import { useCallback, useState } from 'react';
import type { ResearchSynthesisPreview } from '@/shared/components/synthesis-preview-card';
import { useResearchChat } from '../hooks/use-research-chat';
import { useStartResearch } from '../hooks/use-start-research';
import { useSynthesizeResearch } from '../hooks/use-synthesize-research';
import { ResearchChatDialog } from './research-chat-dialog';

interface ResearchChatContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResearchChatContainer({
  open,
  onOpenChange,
}: ResearchChatContainerProps) {
  const chat = useResearchChat();
  const synthesizeMutation = useSynthesizeResearch();
  const startResearchMutation = useStartResearch();
  const [autoGeneratePodcast, setAutoGeneratePodcast] = useState(false);
  const [preview, setPreview] = useState<ResearchSynthesisPreview | null>(null);

  const startError = startResearchMutation.error ?? undefined;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setAutoGeneratePodcast(false);
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

  const handleConfirmResearch = useCallback(() => {
    if (!preview || startResearchMutation.isPending) return;

    startResearchMutation.mutate(
      { query: preview.query, title: preview.title, autoGeneratePodcast },
      {
        onSuccess: () => handleOpenChange(false),
      },
    );
  }, [preview, startResearchMutation, autoGeneratePodcast, handleOpenChange]);

  const handleDismissPreview = useCallback(() => {
    setPreview(null);
    chat.extendFollowUps();
  }, [chat]);

  return (
    <ResearchChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      canStartResearch={chat.canStartResearch}
      autoStartReady={chat.shouldAutoStart}
      synthesizeError={synthesizeMutation.error ?? undefined}
      startError={startError}
      onSendMessage={handleSendMessage}
      onSynthesize={handleSynthesize}
      isSynthesizing={synthesizeMutation.isPending}
      preview={preview}
      onConfirmResearch={handleConfirmResearch}
      isStartingResearch={startResearchMutation.isPending}
      onDismissPreview={handleDismissPreview}
      autoGeneratePodcast={autoGeneratePodcast}
      onAutoGeneratePodcastChange={setAutoGeneratePodcast}
      followUpCount={chat.followUpCount}
      followUpLimit={chat.followUpLimit}
      onKeepRefining={chat.extendFollowUps}
    />
  );
}
