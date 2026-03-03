import { useCallback, useState } from 'react';
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

  const isStartingResearch =
    synthesizeMutation.isPending || startResearchMutation.isPending;
  const startError =
    synthesizeMutation.error ?? startResearchMutation.error ?? undefined;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setAutoGeneratePodcast(false);
        chat.reset();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, chat],
  );

  const handleStartResearch = useCallback(() => {
    if (chat.messages.length === 0 || isStartingResearch) return;

    synthesizeMutation.mutate(chat.messages, {
      onSuccess: ({ query, title }) => {
        startResearchMutation.mutate(
          { query, title, autoGeneratePodcast },
          {
            onSuccess: () => handleOpenChange(false),
          },
        );
      },
    });
  }, [
    chat.messages,
    isStartingResearch,
    synthesizeMutation,
    startResearchMutation,
    autoGeneratePodcast,
    handleOpenChange,
  ]);

  return (
    <ResearchChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      canStartResearch={chat.canStartResearch}
      autoStartReady={chat.shouldAutoStart}
      startError={startError}
      onSendMessage={(text) => chat.sendMessage({ text })}
      onStartResearch={handleStartResearch}
      isStartingResearch={isStartingResearch}
      autoGeneratePodcast={autoGeneratePodcast}
      onAutoGeneratePodcastChange={setAutoGeneratePodcast}
      followUpCount={chat.followUpCount}
      followUpLimit={chat.followUpLimit}
      onKeepRefining={chat.extendFollowUps}
    />
  );
}
